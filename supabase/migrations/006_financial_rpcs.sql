-- ============================================================
-- Migración: RPC y Transacciones Críticas (Fase 9)
-- Fecha: 2026-05-05
-- Propósito: Garantizar la atomicidad y seguridad en operaciones financieras complejas.
-- ============================================================

-- 1. RPC: Transferencia de fondos entre rubros presupuestarios
CREATE OR REPLACE FUNCTION rpc_transfer_budget_funds(
    p_source_allocation_id BIGINT,
    p_target_allocation_id BIGINT,
    p_amount DECIMAL,
    p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
    v_company_id BIGINT;
    v_source_budget_id BIGINT;
    v_target_budget_id BIGINT;
    v_source_amount DECIMAL;
    v_user_id BIGINT;
BEGIN
    -- Obtener empresa del usuario autenticado
    v_company_id := public.get_auth_user_company_id();
    v_user_id := public.get_auth_user_id();

    -- Validar SuperAdmin (según regla del negocio previa)
    IF public.get_auth_user_role() != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Seguridad: Solo Super Administradores pueden realizar transferencias.';
    END IF;

    -- Validar monto
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a cero.';
    END IF;

    -- Obtener datos de origen y validar empresa
    SELECT ba."budgetId", ba."amountUSD" INTO v_source_budget_id, v_source_amount
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = p_source_allocation_id AND b."companyId" = v_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rubro de origen no encontrado o no pertenece a su empresa.';
    END IF;

    -- Obtener datos de destino y validar empresa y mismo presupuesto
    SELECT ba."budgetId" INTO v_target_budget_id
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    WHERE ba.id = p_target_allocation_id AND b."companyId" = v_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rubro de destino no encontrado o no pertenece a su empresa.';
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
    v_user_id BIGINT;
    v_company_account_id BIGINT;
    v_account_type "AccountType";
    v_invoice_id BIGINT;
    v_allocation_id BIGINT;
    v_amount_usd DECIMAL;
BEGIN
    v_company_id := public.get_auth_user_company_id();
    v_user_id := public.get_auth_user_id();
    
    v_company_account_id := (p_invoice_data->>'companyAccountId')::BIGINT;
    v_allocation_id := (p_invoice_data->>'allocationId')::BIGINT;
    v_amount_usd := (p_invoice_data->>'amountUSD')::DECIMAL;

    -- 1. Validar Cuenta Contable
    SELECT ga.type INTO v_account_type
    FROM "CompanyAccount" ca
    JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
    WHERE ca.id = v_company_account_id AND ca."companyId" = v_company_id AND ca."isActive" = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta contable inválida, inactiva o no pertenece a su empresa.';
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
BEGIN
    v_company_id := public.get_auth_user_company_id();
    v_user_id := public.get_auth_user_id();

    SELECT "companyId", "allocationId", "amountUSD", "amountVES", "status"
    INTO v_company_id, v_allocation_id, v_amount_usd, v_amount_ves, v_status
    FROM "Invoice" WHERE id = p_invoice_id;

    IF NOT FOUND OR v_company_id != public.get_auth_user_company_id() THEN
        RAISE EXCEPTION 'Factura no encontrada o no autorizada.';
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
    v_company_id := public.get_auth_user_company_id();
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
    v_user_id BIGINT;
    v_adjustment_id BIGINT;
BEGIN
    v_company_id := public.get_auth_user_company_id();
    v_user_id := public.get_auth_user_id();

    -- Validar que la asignación pertenezca a la empresa
    IF NOT EXISTS (
        SELECT 1 FROM "BudgetAllocation" ba
        JOIN "Budget" b ON b.id = ba."budgetId"
        WHERE ba.id = p_allocation_id AND b."companyId" = v_company_id
    ) THEN
        RAISE EXCEPTION 'Asignación presupuestaria no encontrada.';
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

-- 6. RPC: Actualización de Factura (con rebalanceo presupuestario)
CREATE OR REPLACE FUNCTION rpc_update_invoice(
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
BEGIN
    v_company_id := public.get_auth_user_company_id();

    -- 1. Obtener datos viejos y validar empresa
    SELECT "allocationId", "amountUSD", "amountVES" 
    INTO v_old_allocation_id, v_old_amount_usd, v_old_amount_ves
    FROM "Invoice" WHERE id = p_invoice_id AND "companyId" = v_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Factura no encontrada o no autorizada.';
    END IF;

    v_new_allocation_id := (p_invoice_data->>'allocationId')::BIGINT;
    v_new_amount_usd := (p_invoice_data->>'amountUSD')::DECIMAL;
    v_new_amount_ves := (p_invoice_data->>'amountVES')::DECIMAL;

    -- 2. Revertir Presupuesto Viejo
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" - v_old_amount_usd,
        "consumedVES" = "consumedVES" - v_old_amount_ves
    WHERE id = v_old_allocation_id;

    -- 3. Aplicar Presupuesto Nuevo
    UPDATE "BudgetAllocation" 
    SET "consumedUSD" = "consumedUSD" + v_new_amount_usd,
        "consumedVES" = "consumedVES" + v_new_amount_ves
    WHERE id = v_new_allocation_id;

    -- 4. Actualizar Factura
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

    -- 5. Auditoría
    INSERT INTO "AuditLog" ("action", "entity", "entityId", "details", "userId", "companyId")
    VALUES ('UPDATE', 'Invoice', p_invoice_id, p_invoice_data, public.get_auth_user_id(), v_company_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
