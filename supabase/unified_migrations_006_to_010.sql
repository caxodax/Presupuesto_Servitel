-- ==============================================================================
-- SCRIPT UNIFICADO DE MIGRACIONES (006 a 010) - PRESUPUESTO SERVITEL
-- ==============================================================================
-- Este script consolida todas las migraciones acumuladas desde la versión 006
-- hasta la 010 para ser ejecutadas en bloque en el SQL Editor de Supabase.
-- ==============================================================================

-- ==============================================================================
-- MIGRACIÓN 006: RPC y Transacciones Críticas (Fase 9)
-- ==============================================================================

-- 1. RPC: Transferencia de fondos entre rubros presupuestarios
CREATE OR REPLACE FUNCTION rpc_transfer_budget_funds(
    p_source_allocation_id BIGINT,
    p_target_allocation_id BIGINT,
    p_amount DECIMAL,
    p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_branch_id BIGINT;
    v_source_budget_id BIGINT;
    v_target_budget_id BIGINT;
    v_source_amount DECIMAL;
    v_budget_status TEXT;
    v_user_id BIGINT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rpc_transfer_budget_funds(
    p_source_allocation_id BIGINT,
    p_target_allocation_id BIGINT,
    p_amount DECIMAL,
    p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_branch_id BIGINT;
    v_source_budget_id BIGINT;
    v_target_budget_id BIGINT;
    v_source_amount DECIMAL;
    v_budget_status TEXT;
    v_user_id BIGINT;
BEGIN
    -- 1. Obtener contexto de empresa desde el presupuesto de origen
    SELECT b."companyId", b."branchId", ba."budgetId", ba."amountUSD" 
    INTO v_company_id, v_branch_id, v_source_budget_id, v_source_amount
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = p_source_allocation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rubro de origen no encontrado.';
    END IF;

    -- 2. Refrescar estados automáticamente
    PERFORM public.rpc_refresh_budget_status(v_branch_id);

    -- 3. Validar que el presupuesto esté ACTIVO
    SELECT "status" INTO v_budget_status FROM "Budget" WHERE id = v_source_budget_id;
    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: El presupuesto para esta transferencia no está activo.';
    END IF;

    -- 4. Validar Seguridad
    IF public.get_auth_user_role() != 'SUPER_ADMIN' AND v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Seguridad: No tiene permisos para realizar transferencias en esta empresa.';
    END IF;

    -- 3. Obtener datos de destino y validar mismo presupuesto
    SELECT ba."budgetId" INTO v_target_budget_id
    FROM "BudgetAllocation" ba
    WHERE ba.id = p_target_allocation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rubro de destino no encontrado.';
    END IF;

    IF v_source_budget_id != v_target_budget_id THEN
        RAISE EXCEPTION 'Los rubros deben pertenecer al mismo ciclo presupuestario.';
    END IF;

    -- Validar saldo suficiente
    IF v_source_amount < p_amount THEN
        RAISE EXCEPTION 'Fondos insuficientes en el origen. Disponible: %', v_source_amount;
    END IF;

    -- EJECUTAR TRANSFERENCIA (Atómica)
    UPDATE "BudgetAllocation" SET "amountUSD" = "amountUSD" - p_amount WHERE id = p_source_allocation_id;
    UPDATE "BudgetAllocation" SET "amountUSD" = "amountUSD" + p_amount WHERE id = p_target_allocation_id;

    -- Registrar Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('TRANSFER', 'BudgetAllocation', p_source_allocation_id, 
            jsonb_build_object('targetId', p_target_allocation_id, 'amount', p_amount, 'reason', p_reason),
            v_user_id, v_company_id);

    RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: Registro de Factura con Ajuste Presupuestario
CREATE OR REPLACE FUNCTION rpc_register_invoice(
    p_invoice_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_branch_id BIGINT;
    v_user_id BIGINT;
    v_company_account_id BIGINT;
    v_account_type "AccountType";
    v_invoice_id BIGINT;
    v_allocation_id BIGINT;
    v_amount_usd DECIMAL;
    v_budget_status TEXT;
BEGIN
    v_allocation_id := (p_invoice_data->>'allocationId')::BIGINT;
    v_company_account_id := (p_invoice_data->>'companyAccountId')::BIGINT;
    v_amount_usd := (p_invoice_data->>'amountUSD')::DECIMAL;

    -- 1. Obtener contexto de empresa y sucursal desde la asignación
    SELECT b."companyId", b."branchId", b."status" INTO v_company_id, v_branch_id, v_budget_status
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = v_allocation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Asignación presupuestaria no encontrada.';
    END IF;

    -- 2. Refrescar estados automáticamente por fecha
    PERFORM public.rpc_refresh_budget_status(v_branch_id);

    -- 3. Validar que el presupuesto esté ACTIVO (después del refresh)
    SELECT "status" INTO v_budget_status FROM "Budget" b 
    JOIN "BudgetAllocation" ba ON ba."budgetId" = b.id 
    WHERE ba.id = v_allocation_id;

    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: El presupuesto no está activo o ya ha sido cerrado.';
    END IF;

    -- 4. Validar Seguridad
    IF public.get_auth_user_role() != 'SUPER_ADMIN' AND v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Seguridad: No tiene permisos para operar en esta empresa.';
    END IF;

    v_user_id := public.get_auth_user_id();

    -- 3. Validar Cuenta Contable
    SELECT ga.type INTO v_account_type
    FROM "CompanyAccount" ca
    JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
    WHERE ca.id = v_company_account_id AND ca."companyId" = v_company_id AND ca."isActive" = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta contable inválida, inactiva o no pertenece a la empresa del presupuesto.';
    END IF;

    IF v_account_type NOT IN ('COST', 'EXPENSE') THEN
        RAISE EXCEPTION 'Tipo de cuenta inválido para facturas: %. Debe ser COST o EXPENSE.', v_account_type;
    END IF;

    -- 2. Insertar Factura
    INSERT INTO "Invoice" (
        "number", "supplierName", "allocationId", "amountUSD", "amountVES", 
        "exchangeRate", "date", "companyId", "companyAccountId", "registeredById",
        "attachmentKey", "attachmentName"
    ) VALUES (
        p_invoice_data->>'number',
        p_invoice_data->>'supplierName',
        v_allocation_id,
        v_amount_usd,
        (p_invoice_data->>'amountVES')::DECIMAL,
        (p_invoice_data->>'exchangeRate')::DECIMAL,
        (p_invoice_data->>'date')::TIMESTAMPTZ,
        v_company_id,
        v_company_account_id,
        v_user_id,
        p_invoice_data->>'attachmentKey',
        p_invoice_data->>'attachmentName'
    ) RETURNING id INTO v_invoice_id;

    -- 3. Actualizar Consumo Presupuestario
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" + v_amount_usd,
        "consumedVES" = "consumedVES" + (p_invoice_data->>'amountVES')::DECIMAL
    WHERE id = v_allocation_id;

    -- 4. Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('CREATE', 'Invoice', v_invoice_id, p_invoice_data, v_user_id, v_company_id);

    RETURN jsonb_build_object('success', true, 'id', v_invoice_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Anulación de Factura
CREATE OR REPLACE FUNCTION rpc_cancel_invoice(
    p_invoice_id BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_user_id BIGINT;
    v_allocation_id BIGINT;
    v_amount_usd DECIMAL;
    v_amount_ves DECIMAL;
    v_status TEXT;
    v_budget_status TEXT;
BEGIN
    v_company_id := public.get_auth_user_company_id();
    v_user_id := public.get_auth_user_id();

    SELECT i."companyId", i."allocationId", i."amountUSD", i."amountVES", i."status", b."status" as budget_status
    INTO v_company_id, v_allocation_id, v_amount_usd, v_amount_ves, v_status, v_budget_status
    FROM "Invoice" i
    JOIN "BudgetAllocation" ba ON ba.id = i."allocationId"
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE i.id = p_invoice_id;

    IF NOT FOUND OR (v_company_id != public.get_auth_user_company_id() AND public.get_auth_user_role() != 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Factura no encontrada o no autorizada.';
    END IF;

    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: No se puede anular facturas de un presupuesto cerrado.';
    END IF;

    IF v_status = 'CANCELLED' THEN
        RAISE EXCEPTION 'La factura ya está anulada.';
    END IF;

    -- 1. Revertir Presupuesto
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" - v_amount_usd,
        "consumedVES" = "consumedVES" - v_amount_ves
    WHERE id = v_allocation_id;

    -- 2. Marcar como Cancelada
    UPDATE "Invoice" SET "status" = 'CANCELLED' WHERE id = p_invoice_id;

    -- 3. Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('CANCEL', 'Invoice', p_invoice_id, jsonb_build_object('originalAmount', v_amount_usd), v_user_id, v_company_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Registro de Ingreso
CREATE OR REPLACE FUNCTION rpc_register_income(
    p_income_data JSONB
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_user_id BIGINT;
    v_company_account_id BIGINT;
    v_account_type "AccountType";
    v_income_id BIGINT;
BEGIN
	IF public.get_auth_user_role() = 'SUPER_ADMIN' THEN
		v_company_id := (p_income_data->>'companyId')::BIGINT;
	ELSE
		v_company_id := public.get_auth_user_company_id();
	END IF;

	IF v_company_id IS NULL THEN
		RAISE EXCEPTION 'Contexto de empresa no encontrado.';
	END IF;

	v_user_id := public.get_auth_user_id();
    
    v_company_account_id := (p_income_data->>'companyAccountId')::BIGINT;

    -- Validar Cuenta
    SELECT ga.type INTO v_account_type
    FROM "CompanyAccount" ca
    JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
    WHERE ca.id = v_company_account_id AND ca."companyId" = v_company_id AND ca."isActive" = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta contable inválida o inactiva.';
    END IF;

    IF v_account_type != 'INCOME' THEN
        RAISE EXCEPTION 'La cuenta debe ser de tipo INCOME.';
    END IF;

    -- Insertar
    INSERT INTO "Income" (
        "number", "clientName", "categoryId", "subcategoryId", "companyId", 
        "companyAccountId", "amountUSD", "amountVES", "exchangeRate", "date",
        "registeredById", "notes", "attachmentKey", "attachmentName", "branchId"
    ) VALUES (
        p_income_data->>'number',
        p_income_data->>'clientName',
        (p_income_data->>'categoryId')::BIGINT,
        (p_income_data->>'subcategoryId')::BIGINT,
        v_company_id,
        v_company_account_id,
        (p_income_data->>'amountUSD')::DECIMAL,
        (p_income_data->>'amountVES')::DECIMAL,
        (p_income_data->>'exchangeRate')::DECIMAL,
        (p_income_data->>'date')::TIMESTAMPTZ,
        v_user_id,
        p_income_data->>'notes',
        p_income_data->>'attachmentKey',
        p_income_data->>'attachmentName',
        (p_income_data->>'branchId')::BIGINT
    ) RETURNING id INTO v_income_id;

    -- Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('CREATE', 'Income', v_income_id, p_income_data, v_user_id, v_company_id);

    RETURN jsonb_build_object('success', true, 'id', v_income_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Ajuste Presupuestario
CREATE OR REPLACE FUNCTION rpc_budget_adjustment(
    p_allocation_id BIGINT,
    p_company_account_id BIGINT,
    p_amount_usd DECIMAL,
    p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_branch_id BIGINT;
    v_budget_id BIGINT;
    v_user_id BIGINT;
    v_adjustment_id BIGINT;
    v_budget_status TEXT;
BEGIN
    -- Obtener contexto de empresa desde el presupuesto
    SELECT b."companyId", b."branchId", b.id INTO v_company_id, v_branch_id, v_budget_id
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = p_allocation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Asignación presupuestaria no encontrada.';
    END IF;

    -- Refrescar estados automáticamente
    PERFORM public.rpc_refresh_budget_status(v_branch_id);

    -- Validar que el presupuesto esté ACTIVO
    SELECT "status" INTO v_budget_status FROM "Budget" WHERE id = v_budget_id;
    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: El presupuesto para este ajuste no está activo.';
    END IF;

    v_user_id := public.get_auth_user_id();

    -- Validar Seguridad
    IF public.get_auth_user_role() != 'SUPER_ADMIN' AND v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Seguridad: No tiene permisos para realizar ajustes en esta empresa.';
    END IF;

    -- Insertar Ajuste
    INSERT INTO "BudgetAdjustment" (
        "allocationId", "companyAccountId", "amountUSD", "amountVES", 
        "reason", "recordedById"
    ) VALUES (
        p_allocation_id,
        p_company_account_id,
        p_amount_usd,
        0, -- Asumimos VES 0 para ajustes simples en USD por ahora
        p_reason,
        v_user_id
    ) RETURNING id INTO v_adjustment_id;

    -- Actualizar Rubro
    UPDATE "BudgetAllocation" 
    SET "amountUSD" = "amountUSD" + p_amount_usd 
    WHERE id = p_allocation_id;

    -- Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('ADJUST', 'BudgetAllocation', p_allocation_id, 
            jsonb_build_object('amount', p_amount_usd, 'reason', p_reason), 
            v_user_id, v_company_id);

    RETURN jsonb_build_object('success', true, 'id', v_adjustment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- MIGRACIÓN 007 (A): Gestión de Ciclos y Cierre de Presupuestos
-- ==============================================================================

-- 1. Restricción: Solo un presupuesto ACTIVO por sucursal
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_budget_per_branch 
ON "Budget" ("branchId") 
WHERE "status" = 'ACTIVE';

-- 2. Función: Refrescar estados de presupuesto por fecha
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


-- ==============================================================================
-- MIGRACIÓN 007 (B): Cuentas Contables Obligatorias (Cut-off Técnico)
-- ==============================================================================

SET session_replication_role = 'replica';

DO $$ 
DECLARE
    r RECORD;
    v_dummy_acc_id BIGINT;
BEGIN
    -- Backfill Invoices
    FOR r IN SELECT id, "companyId" FROM "Invoice" WHERE "companyAccountId" IS NULL LOOP
        SELECT id INTO v_dummy_acc_id FROM "CompanyAccount" WHERE "companyId" = r."companyId" LIMIT 1;
        IF v_dummy_acc_id IS NOT NULL THEN
            UPDATE "Invoice" SET "companyAccountId" = v_dummy_acc_id WHERE id = r.id;
        END IF;
    END LOOP;

    -- Backfill Incomes
    FOR r IN SELECT id, "companyId" FROM "Income" WHERE "companyAccountId" IS NULL LOOP
        SELECT id INTO v_dummy_acc_id FROM "CompanyAccount" WHERE "companyId" = r."companyId" LIMIT 1;
        IF v_dummy_acc_id IS NOT NULL THEN
            UPDATE "Income" SET "companyAccountId" = v_dummy_acc_id WHERE id = r.id;
        END IF;
    END LOOP;

    -- Backfill BudgetAllocations
    FOR r IN SELECT ba.id, b."companyId" 
             FROM "BudgetAllocation" ba 
             JOIN "Budget" b ON ba."budgetId" = b.id 
             WHERE ba."companyAccountId" IS NULL LOOP
        SELECT id INTO v_dummy_acc_id FROM "CompanyAccount" WHERE "companyId" = r."companyId" LIMIT 1;
        IF v_dummy_acc_id IS NOT NULL THEN
            UPDATE "BudgetAllocation" SET "companyAccountId" = v_dummy_acc_id WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- Aplicar restricciones NOT NULL
ALTER TABLE "Invoice" ALTER COLUMN "companyAccountId" SET NOT NULL;
ALTER TABLE "Income" ALTER COLUMN "companyAccountId" SET NOT NULL;
ALTER TABLE "BudgetAllocation" ALTER COLUMN "companyAccountId" SET NOT NULL;

-- Índices de optimización
CREATE INDEX IF NOT EXISTS "idx_invoice_company_account" ON "Invoice"("companyAccountId");
CREATE INDEX IF NOT EXISTS "idx_income_company_account" ON "Income"("companyAccountId");
CREATE INDEX IF NOT EXISTS "idx_budget_alloc_company_account" ON "BudgetAllocation"("companyAccountId");

COMMENT ON COLUMN "Invoice"."companyAccountId" IS 'Enforced mandatory hierarchical account for P&L reporting.';
COMMENT ON COLUMN "Income"."companyAccountId" IS 'Enforced mandatory hierarchical account for P&L reporting.';
COMMENT ON COLUMN "BudgetAllocation"."companyAccountId" IS 'Enforced mandatory hierarchical account for budget control.';

SET session_replication_role = 'origin';


-- ==============================================================================
-- MIGRACIÓN 008: Añadir Detalles Corporativos a Empresa
-- ==============================================================================

ALTER TABLE "Company" 
ADD COLUMN IF NOT EXISTS "taxId" TEXT,
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "baseCurrency" TEXT DEFAULT 'USD';


-- ==============================================================================
-- MIGRACIÓN 009: Estabilidad Técnica, Integridad y Auditoría (Fase 9)
-- ==============================================================================

-- 1. Prevenir eliminación con historial
CREATE OR REPLACE FUNCTION public.check_movements_before_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_count BIGINT;
    v_table_name TEXT;
BEGIN
    v_table_name := TG_TABLE_NAME;

    IF v_table_name = 'CompanyAccount' THEN
        -- Verificar si la cuenta tiene facturas, ingresos o asignaciones
        SELECT COUNT(*) INTO v_count FROM "Invoice" WHERE "companyAccountId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar la cuenta porque tiene facturas asociadas. Desactívela en su lugar.'; END IF;

        SELECT COUNT(*) INTO v_count FROM "Income" WHERE "companyAccountId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar la cuenta porque tiene ingresos asociados. Desactívela en su lugar.'; END IF;

        SELECT COUNT(*) INTO v_count FROM "BudgetAllocation" WHERE "companyAccountId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar la cuenta porque está asignada a un presupuesto.'; END IF;

    ELSIF v_table_name = 'Budget' THEN
        -- Verificar si el presupuesto tiene asignaciones con movimientos
        SELECT COUNT(*) INTO v_count 
        FROM "BudgetAllocation" ba
        JOIN "Invoice" i ON i."allocationId" = ba.id
        WHERE ba."budgetId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar el presupuesto porque tiene facturas registradas.'; END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de prevención
DROP TRIGGER IF EXISTS trg_prevent_delete_company_account ON "CompanyAccount";
CREATE TRIGGER trg_prevent_delete_company_account
BEFORE DELETE ON "CompanyAccount"
FOR EACH ROW EXECUTE FUNCTION public.check_movements_before_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_budget ON "Budget";
CREATE TRIGGER trg_prevent_delete_budget
BEFORE DELETE ON "Budget"
FOR EACH ROW EXECUTE FUNCTION public.check_movements_before_delete();

-- 2. Triggers de Auditoría
DROP TRIGGER IF EXISTS trg_audit_invoice ON "Invoice";
CREATE TRIGGER trg_audit_invoice
AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_income ON "Income";
CREATE TRIGGER trg_audit_income
AFTER INSERT OR UPDATE OR DELETE ON "Income"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget ON "Budget";
CREATE TRIGGER trg_audit_budget
AFTER INSERT OR UPDATE OR DELETE ON "Budget"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget_allocation ON "BudgetAllocation";
CREATE TRIGGER trg_audit_budget_allocation
AFTER INSERT OR UPDATE OR DELETE ON "BudgetAllocation"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget_adjustment ON "BudgetAdjustment";
CREATE TRIGGER trg_audit_budget_adjustment
AFTER INSERT OR UPDATE OR DELETE ON "BudgetAdjustment"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_budgetadjustment_allocation ON "BudgetAdjustment"("allocationId");
CREATE INDEX IF NOT EXISTS idx_budgetadjustment_companyaccount ON "BudgetAdjustment"("companyAccountId");

CREATE INDEX IF NOT EXISTS idx_invoice_composite_list 
ON "Invoice"("companyId", "status", "date" DESC);


-- ==============================================================================
-- MIGRACIÓN 010: Automatización de Cierre de Periodos (Lazy Refresh)
-- ==============================================================================

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
    v_budget_status TEXT;
BEGIN
    -- 1. Obtener datos viejos y validar seguridad
    SELECT i."companyId", i."allocationId", i."amountUSD", i."amountVES", b."status"
    INTO v_company_id, v_old_allocation_id, v_old_amount_usd, v_old_amount_ves, v_budget_status
    FROM "Invoice" i
    JOIN "BudgetAllocation" ba ON ba.id = i."allocationId"
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE i.id = p_invoice_id;

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

    -- 3. Validar presupuesto viejo antes de revertir
    SELECT b."status" INTO v_budget_status
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = v_old_allocation_id;

    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: El presupuesto original de esta factura ya está cerrado.';
    END IF;

    -- 4. Validar presupuesto nuevo antes de aplicar
    SELECT b."status" INTO v_budget_status
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = v_new_allocation_id;

    IF v_budget_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Operación denegada: El presupuesto de destino no está activo o ya ha sido cerrado.';
    END IF;

    -- 5. Revertir Presupuesto Viejo
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" - v_old_amount_usd,
        "consumedVES" = "consumedVES" - v_old_amount_ves
    WHERE id = v_old_allocation_id;

    -- 6. Aplicar Presupuesto Nuevo
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" + v_new_amount_usd,
        "consumedVES" = "consumedVES" + v_new_amount_ves
    WHERE id = v_new_allocation_id;

    -- 7. Actualizar Factura
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

    -- 8. Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('UPDATE', 'Invoice', p_invoice_id, p_invoice_data, public.get_auth_user_id(), v_company_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
