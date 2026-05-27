-- ============================================================
-- Migración: Automatización de Cierre de Periodos Presupuestarios
-- Fecha: 2026-05-17
-- Propósito: Cierre automático de periodos por fecha actual (Lazy Refresh)
-- ============================================================

-- 1. Función: Refrescar estados de TODOS los presupuestos en el sistema
CREATE OR REPLACE FUNCTION public.rpc_refresh_all_budgets_status() 
RETURNS VOID AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_branch_id BIGINT;
BEGIN
    -- A. Cerrar todos los presupuestos ACTIVE que ya hayan vencido
    UPDATE "Budget" 
    SET "status" = 'CLOSED', "updatedAt" = v_now
    WHERE "status" = 'ACTIVE' 
      AND v_now > "endDate";

    -- B. Para cada sucursal que no tenga presupuesto activo, activar el DRAFT correspondiente a hoy
    FOR v_branch_id IN 
        SELECT b.id FROM "Branch" b 
        WHERE NOT EXISTS (SELECT 1 FROM "Budget" WHERE "branchId" = b.id AND "status" = 'ACTIVE')
    LOOP
        UPDATE "Budget"
        SET "status" = 'ACTIVE', "updatedAt" = v_now
        WHERE id = (
            SELECT id FROM "Budget" 
            WHERE "branchId" = v_branch_id 
              AND "status" = 'DRAFT' 
              AND v_now BETWEEN "initialDate" AND "endDate"
            ORDER BY "initialDate" ASC
            LIMIT 1
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Modificación de rpc_update_invoice para incluir autorefresco
-- Re-declaramos la función completa con la lógica de autorefresco antes de validar/operar.
CREATE OR REPLACE FUNCTION public.rpc_update_invoice(
    p_invoice_id BIGINT,
    p_invoice_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_old_allocation_id BIGINT;
    v_old_amount_usd DECIMAL;
    v_old_amount_ves DECIMAL;
    v_new_allocation_id BIGINT;
    v_new_amount_usd DECIMAL;
    v_new_amount_ves DECIMAL;
    v_old_branch_id BIGINT;
    v_new_branch_id BIGINT;
    v_budget_status public."BudgetStatus";
BEGIN
    -- 1. Obtener datos viejos y validar seguridad
    SELECT "companyId", "allocationId", "amountUSD", "amountVES" 
    INTO v_company_id, v_old_allocation_id, v_old_amount_usd, v_old_amount_ves
    FROM "Invoice" WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Factura no encontrada.';
    END IF;

    -- Validar Seguridad
    IF public.get_auth_user_role() != 'SUPER_ADMIN' AND v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Seguridad: No tiene permisos para modificar esta factura.';
    END IF;

    v_new_allocation_id := (p_invoice_data->>'allocationId')::BIGINT;
    v_new_amount_usd := (p_invoice_data->>'amountUSD')::DECIMAL;
    v_new_amount_ves := (p_invoice_data->>'amountVES')::DECIMAL;

    -- 2. Obtener sucursales para autorefresco de presupuestos
    SELECT b."branchId" INTO v_old_branch_id 
    FROM "BudgetAllocation" ba 
    JOIN "Budget" b ON ba."budgetId" = b.id 
    WHERE ba.id = v_old_allocation_id;
    
    SELECT b."branchId" INTO v_new_branch_id 
    FROM "BudgetAllocation" ba 
    JOIN "Budget" b ON ba."budgetId" = b.id 
    WHERE ba.id = v_new_allocation_id;

    -- Refrescar estados de los presupuestos correspondientes
    IF v_old_branch_id IS NOT NULL THEN
        PERFORM public.rpc_refresh_budget_status(v_old_branch_id);
    END IF;
    IF v_new_branch_id IS NOT NULL AND v_new_branch_id != v_old_branch_id THEN
        PERFORM public.rpc_refresh_budget_status(v_new_branch_id);
    END IF;

    -- 3. Validar que el presupuesto de destino esté ACTIVO después de refrescar
    SELECT "status" INTO v_budget_status FROM "Budget" b 
    JOIN "BudgetAllocation" ba ON ba."budgetId" = b.id 
    WHERE ba.id = v_new_allocation_id;

    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: El presupuesto de destino no está activo o ya ha sido cerrado.';
    END IF;

    -- 4. Revertir Presupuesto Viejo
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" - v_old_amount_usd,
        "consumedVES" = "consumedVES" - v_old_amount_ves
    WHERE id = v_old_allocation_id;

    -- 5. Aplicar Presupuesto Nuevo
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" + v_new_amount_usd,
        "consumedVES" = "consumedVES" + v_new_amount_ves
    WHERE id = v_new_allocation_id;

    -- 6. Actualizar Factura
    UPDATE "Invoice" SET
        "number" = p_invoice_data->>'number',
        "supplierName" = p_invoice_data->>'supplierName',
        "allocationId" = v_new_allocation_id,
        "amountUSD" = v_new_amount_usd,
        "amountVES" = v_new_amount_ves,
        "exchangeRate" = (p_invoice_data->>'exchangeRate')::DECIMAL,
        "date" = (p_invoice_data->>'date')::TIMESTAMPTZ,
        "companyAccountId" = (p_invoice_data->>'companyAccountId')::BIGINT,
        "attachmentKey" = p_invoice_data->>'attachmentKey',
        "attachmentName" = p_invoice_data->>'attachmentName'
    WHERE id = p_invoice_id;

    -- 7. Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('UPDATE', 'Invoice', p_invoice_id, p_invoice_data, public.get_auth_user_id(), v_company_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
