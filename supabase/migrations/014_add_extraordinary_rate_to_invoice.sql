-- Add extraordinaryRate to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "extraordinaryRate" DECIMAL NULL;

-- Update rpc_register_invoice to support extraordinaryRate
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
    v_budget_status public."BudgetStatus";
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
        "exchangeRate", "extraordinaryRate", "date", "companyId", "companyAccountId", "registeredById",
        "attachmentKey", "attachmentName"
    ) VALUES (
        p_invoice_data->>'number',
        p_invoice_data->>'supplierName',
        v_allocation_id,
        v_amount_usd,
        (p_invoice_data->>'amountVES')::DECIMAL,
        (p_invoice_data->>'exchangeRate')::DECIMAL,
        (p_invoice_data->>'extraordinaryRate')::DECIMAL,
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

-- Update rpc_update_invoice to support extraordinaryRate
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
        "extraordinaryRate" = (p_invoice_data->>'extraordinaryRate')::DECIMAL,
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

-- Recreate invoice_list_view to include extraordinaryRate
DROP VIEW IF EXISTS public.invoice_list_view;
CREATE OR REPLACE VIEW public.invoice_list_view AS
SELECT 
    i.id,
    i.number,
    i."supplierName",
    i."amountUSD",
    i."amountVES",
    i."exchangeRate",
    i."extraordinaryRate",
    i.date,
    i.status,
    i."companyId",
    i."companyAccountId",
    i."allocationId",
    i."createdAt",
    c.name as "companyName",
    c."groupId" as "companyGroupId",
    u.name as "registeredByName",
    ga.code as "accountCode",
    ga.name as "accountName",
    a."categoryId",
    cat.name as "categoryName",
    b.id as "budgetId",
    b.name as "budgetName",
    b."branchId",
    br.name as "branchName"
FROM "Invoice" i
LEFT JOIN "Company" c ON i."companyId" = c.id
LEFT JOIN "User" u ON i."registeredById" = u.id
LEFT JOIN "CompanyAccount" ca ON i."companyAccountId" = ca.id
LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id
LEFT JOIN "BudgetAllocation" a ON i."allocationId" = a.id
LEFT JOIN "Category" cat ON a."categoryId" = cat.id
LEFT JOIN "Budget" b ON a."budgetId" = b.id
LEFT JOIN "Branch" br ON b."branchId" = br.id;
