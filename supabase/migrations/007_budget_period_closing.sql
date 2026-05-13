-- ============================================================
-- Migración: Gestión de Ciclos y Cierre de Presupuestos
-- Fecha: 2026-05-13
-- ============================================================

-- 1. Restricción: Solo un presupuesto ACTIVO por sucursal
-- Usamos un índice parcial para permitir múltiples CLOSED o DRAFT, pero solo un ACTIVE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_budget_per_branch 
ON "Budget" ("branchId") 
WHERE "status" = 'ACTIVE';

-- 2. Función: Refrescar estados de presupuesto por fecha
-- Esta función cierra presupuestos vencidos y activa el siguiente disponible si está en rango.
CREATE OR REPLACE FUNCTION rpc_refresh_budget_status(p_branch_id BIGINT) 
RETURNS VOID AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
BEGIN
    -- A. Cerrar presupuestos ACTIVE que ya pasaron su fecha de fin
    UPDATE "Budget" 
    SET "status" = 'CLOSED', "updatedAt" = v_now
    WHERE "branchId" = p_branch_id 
      AND "status" = 'ACTIVE' 
      AND v_now > "endDate";

    -- B. Activar el presupuesto DRAFT que debería estar activo hoy
    -- Solo si no hay ningún otro ACTIVE actualmente (para evitar colisiones)
    IF NOT EXISTS (SELECT 1 FROM "Budget" WHERE "branchId" = p_branch_id AND "status" = 'ACTIVE') THEN
        UPDATE "Budget"
        SET "status" = 'ACTIVE', "updatedAt" = v_now
        WHERE id = (
            SELECT id FROM "Budget" 
            WHERE "branchId" = p_branch_id 
              AND "status" = 'DRAFT' 
              AND v_now BETWEEN "initialDate" AND "endDate"
            ORDER BY "initialDate" ASC
            LIMIT 1
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función: Cerrar Presupuesto Manualmente
CREATE OR REPLACE FUNCTION rpc_close_budget_manually(p_budget_id BIGINT) 
RETURNS JSONB AS $$
DECLARE
    v_branch_id BIGINT;
    v_company_id BIGINT;
BEGIN
    SELECT "branchId", "companyId" INTO v_branch_id, v_company_id 
    FROM "Budget" WHERE id = p_budget_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Presupuesto no encontrado.';
    END IF;

    -- Validar Seguridad (Solo Admin de la empresa o SuperAdmin)
    IF public.get_auth_user_role() != 'SUPER_ADMIN' AND v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Seguridad: No tiene permisos para cerrar este presupuesto.';
    END IF;

    UPDATE "Budget" SET "status" = 'CLOSED', "updatedAt" = now() WHERE id = p_budget_id;

    -- Intentar activar el siguiente automáticamente
    PERFORM public.rpc_refresh_budget_status(v_branch_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función: Reactivar Presupuesto Manualmente
CREATE OR REPLACE FUNCTION rpc_reactivate_budget(p_budget_id BIGINT) 
RETURNS JSONB AS $$
DECLARE
    v_branch_id BIGINT;
    v_company_id BIGINT;
    v_active_exists BOOLEAN;
BEGIN
    SELECT "branchId", "companyId" INTO v_branch_id, v_company_id 
    FROM "Budget" WHERE id = p_budget_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Presupuesto no encontrado.';
    END IF;

    -- Validar Seguridad
    IF public.get_auth_user_role() != 'SUPER_ADMIN' AND v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Seguridad: No tiene permisos para reactivar este presupuesto.';
    END IF;

    -- Verificar si ya hay uno activo para esta sucursal
    SELECT EXISTS (
        SELECT 1 FROM "Budget" 
        WHERE "branchId" = v_branch_id AND "status" = 'ACTIVE' AND id != p_budget_id
    ) INTO v_active_exists;

    IF v_active_exists THEN
        RAISE EXCEPTION 'Ya existe un presupuesto activo para esta sucursal. Debe cerrarlo antes de reactivar este.';
    END IF;

    UPDATE "Budget" SET "status" = 'ACTIVE', "updatedAt" = now() WHERE id = p_budget_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
