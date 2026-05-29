-- Migración 012: RPCs para Dashboard y Vistas de Rendimiento para Listados

-- 1. RPC para obtener KPIs consolidados del Dashboard
CREATE OR REPLACE FUNCTION public.rpc_dashboard_kpis(
    p_company_id BIGINT DEFAULT NULL,
    p_branch_id BIGINT DEFAULT NULL,
    p_budget_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    total_limit NUMERIC,
    total_allocated NUMERIC,
    total_consumed NUMERIC,
    total_income NUMERIC,
    net_balance NUMERIC,
    available_capacity NUMERIC,
    overbudget_amount NUMERIC,
    execution_percentage NUMERIC
) AS $$
DECLARE
    v_total_limit NUMERIC := 0;
    v_total_allocated NUMERIC := 0;
    v_total_consumed NUMERIC := 0;
    v_total_income NUMERIC := 0;
BEGIN
    -- Agregado de Budget y BudgetAllocation
    SELECT 
        COALESCE(SUM(b."amountLimitUSD"), 0),
        COALESCE(SUM(alloc_sum.allocated), 0),
        COALESCE(SUM(alloc_sum.consumed), 0)
    INTO 
        v_total_limit,
        v_total_allocated,
        v_total_consumed
    FROM "Budget" b
    LEFT JOIN (
        SELECT 
            "budgetId",
            SUM("amountUSD") as allocated,
            SUM("consumedUSD") as consumed
        FROM "BudgetAllocation"
        GROUP BY "budgetId"
    ) alloc_sum ON b.id = alloc_sum."budgetId"
    LEFT JOIN "Company" c ON b."companyId" = c.id
    WHERE 
        (p_company_id IS NULL OR b."companyId" = p_company_id) AND
        (p_branch_id IS NULL OR b."branchId" = p_branch_id) AND
        (p_budget_id IS NULL OR b.id = p_budget_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id);

    -- Agregado de Income
    SELECT 
        COALESCE(SUM(i."amountUSD"), 0)
    INTO 
        v_total_income
    FROM "Income" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    WHERE 
        (p_company_id IS NULL OR i."companyId" = p_company_id) AND
        (p_branch_id IS NULL OR i."branchId" = p_branch_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id);

    -- Cálculos finales
    total_limit := v_total_limit;
    total_allocated := v_total_allocated;
    total_consumed := v_total_consumed;
    total_income := v_total_income;
    net_balance := v_total_income - v_total_consumed;
    available_capacity := v_total_limit - v_total_consumed;
    
    IF v_total_consumed > v_total_limit THEN
        overbudget_amount := v_total_consumed - v_total_limit;
    ELSE
        overbudget_amount := 0;
    END IF;

    IF v_total_limit > 0 THEN
        execution_percentage := (v_total_consumed / v_total_limit) * 100;
    ELSE
        execution_percentage := 0;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 2. RPC para ranking de Sucursales
CREATE OR REPLACE FUNCTION public.rpc_dashboard_branch_ranking(
    p_company_id BIGINT DEFAULT NULL,
    p_branch_id BIGINT DEFAULT NULL,
    p_budget_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    name TEXT,
    consumed NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        br.name::TEXT,
        COALESCE(SUM(a."consumedUSD"), 0)::NUMERIC as consumed
    FROM "Branch" br
    INNER JOIN "Budget" b ON br.id = b."branchId"
    INNER JOIN "BudgetAllocation" a ON b.id = a."budgetId"
    LEFT JOIN "Company" c ON br."companyId" = c.id
    WHERE 
        (p_company_id IS NULL OR br."companyId" = p_company_id) AND
        (p_branch_id IS NULL OR br.id = p_branch_id) AND
        (p_budget_id IS NULL OR b.id = p_budget_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id)
    GROUP BY br.id, br.name
    HAVING COALESCE(SUM(a."consumedUSD"), 0) > 0 OR p_branch_id IS NOT NULL
    ORDER BY consumed DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 3. RPC para ranking de Cuentas Contables (Soporta V16 y Legacy)
CREATE OR REPLACE FUNCTION public.rpc_dashboard_account_ranking(
    p_company_id BIGINT DEFAULT NULL,
    p_branch_id BIGINT DEFAULT NULL,
    p_budget_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    code TEXT,
    name TEXT,
    consumed NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ga.code, legacy.code)::TEXT as code,
        COALESCE(ga.name, legacy.name)::TEXT as name,
        COALESCE(SUM(a."consumedUSD"), 0)::NUMERIC as consumed
    FROM "BudgetAllocation" a
    INNER JOIN "Budget" b ON a."budgetId" = b.id
    LEFT JOIN "CompanyAccount" ca ON a."companyAccountId" = ca.id
    LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id
    LEFT JOIN "AccountingAccount" legacy ON a."accountId" = legacy.id
    LEFT JOIN "Company" c ON b."companyId" = c.id
    WHERE 
        (p_company_id IS NULL OR b."companyId" = p_company_id) AND
        (p_branch_id IS NULL OR b."branchId" = p_branch_id) AND
        (p_budget_id IS NULL OR b.id = p_budget_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id)
    GROUP BY ga.code, ga.name, legacy.code, legacy.name
    HAVING COALESCE(SUM(a."consumedUSD"), 0) > 0
    ORDER BY consumed DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 4. RPC para ranking de Categorías
CREATE OR REPLACE FUNCTION public.rpc_dashboard_category_ranking(
    p_company_id BIGINT DEFAULT NULL,
    p_branch_id BIGINT DEFAULT NULL,
    p_budget_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    name TEXT,
    consumed NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cat.name::TEXT,
        COALESCE(SUM(a."consumedUSD"), 0)::NUMERIC as consumed
    FROM "BudgetAllocation" a
    INNER JOIN "Budget" b ON a."budgetId" = b.id
    INNER JOIN "Category" cat ON a."categoryId" = cat.id
    LEFT JOIN "Company" c ON b."companyId" = c.id
    WHERE 
        (p_company_id IS NULL OR b."companyId" = p_company_id) AND
        (p_branch_id IS NULL OR b."branchId" = p_branch_id) AND
        (p_budget_id IS NULL OR b.id = p_budget_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id)
    GROUP BY cat.id, cat.name
    HAVING COALESCE(SUM(a."consumedUSD"), 0) > 0
    ORDER BY consumed DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 5. Vista optimizada para listado de Facturas (invoice_list_view)
CREATE OR REPLACE VIEW public.invoice_list_view AS
SELECT 
    i.id,
    i.number,
    i."supplierName",
    i."amountUSD",
    i."amountVES",
    i."exchangeRate",
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


-- 6. Vista optimizada para listado de Ingresos (income_list_view)
CREATE OR REPLACE VIEW public.income_list_view AS
SELECT 
    i.id,
    i."amountUSD",
    i."amountVES",
    i."exchangeRate",
    i.date,
    i.number,
    i."clientName",
    i.notes,
    i."companyId",
    i."branchId",
    i."categoryId",
    i."subcategoryId",
    i."companyAccountId",
    i."createdAt",
    c.name as "companyName",
    c."groupId" as "companyGroupId",
    u.name as "registeredByName",
    cat.name as "categoryName",
    sub.name as "subcategoryName",
    br.name as "branchName",
    ga.code as "accountCode",
    ga.name as "accountName"
FROM "Income" i
LEFT JOIN "Company" c ON i."companyId" = c.id
LEFT JOIN "User" u ON i."registeredById" = u.id
LEFT JOIN "Category" cat ON i."categoryId" = cat.id
LEFT JOIN "Subcategory" sub ON i."subcategoryId" = sub.id
LEFT JOIN "Branch" br ON i."branchId" = br.id
LEFT JOIN "CompanyAccount" ca ON i."companyAccountId" = ca.id
LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id;


-- 7. Vista optimizada para listado de Presupuestos (budget_list_view)
CREATE OR REPLACE VIEW public.budget_list_view AS
SELECT 
    b.id,
    b.name,
    b."initialDate",
    b."endDate",
    b.status,
    b."amountLimitUSD",
    b."companyId",
    b."branchId",
    b."createdAt",
    c.name as "companyName",
    c."groupId" as "companyGroupId",
    br.name as "branchName",
    COALESCE(alloc.total_allocated, 0) as "totalAllocated",
    COALESCE(alloc.total_consumed_usd, 0) as "totalConsumedUSD",
    COALESCE(alloc.total_consumed_ves, 0) as "totalConsumedVES"
FROM "Budget" b
LEFT JOIN "Company" c ON b."companyId" = c.id
LEFT JOIN "Branch" br ON b."branchId" = br.id
LEFT JOIN (
    SELECT 
        "budgetId",
        SUM("amountUSD") as total_allocated,
        SUM("consumedUSD") as total_consumed_usd,
        SUM("consumedVES") as total_consumed_ves
    FROM "BudgetAllocation"
    GROUP BY "budgetId"
) alloc ON b.id = alloc."budgetId";
