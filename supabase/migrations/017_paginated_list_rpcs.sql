-- Migración 017: Nuevos RPCs paginados para Listados principales

-- 1. Facturas
DROP FUNCTION IF EXISTS rpc_get_invoice_list;
CREATE OR REPLACE FUNCTION rpc_get_invoice_list(
    p_company_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    id BIGINT,
    number TEXT,
    "supplierName" TEXT,
    "amountUSD" NUMERIC,
    "amountVES" NUMERIC,
    "exchangeRate" NUMERIC,
    date TIMESTAMP WITH TIME ZONE,
    status "InvoiceStatus",
    "companyId" BIGINT,
    "companyAccountId" BIGINT,
    "allocationId" BIGINT,
    "createdAt" TIMESTAMP WITH TIME ZONE,
    "companyName" TEXT,
    "companyGroupId" BIGINT,
    "registeredByName" TEXT,
    "accountCode" TEXT,
    "accountName" TEXT,
    "categoryId" BIGINT,
    "categoryName" TEXT,
    "budgetId" BIGINT,
    "budgetName" TEXT,
    "branchId" BIGINT,
    "branchName" TEXT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
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
        br.name as "branchName",
        count(*) OVER() AS total_count
    FROM "Invoice" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    LEFT JOIN "User" u ON i."registeredById" = u.id
    LEFT JOIN "CompanyAccount" ca ON i."companyAccountId" = ca.id
    LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id
    LEFT JOIN "BudgetAllocation" a ON i."allocationId" = a.id
    LEFT JOIN "Category" cat ON a."categoryId" = cat.id
    LEFT JOIN "Budget" b ON a."budgetId" = b.id
    LEFT JOIN "Branch" br ON b."branchId" = br.id
    WHERE 
        (p_company_id IS NULL OR i."companyId" = p_company_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id) AND
        (p_search IS NULL OR p_search = '' OR i.number ILIKE '%' || p_search || '%' OR i."supplierName" ILIKE '%' || p_search || '%')
    ORDER BY i.date DESC, i.id DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 2. Ingresos
DROP FUNCTION IF EXISTS rpc_get_income_list;
CREATE OR REPLACE FUNCTION rpc_get_income_list(
    p_company_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    id BIGINT,
    "amountUSD" NUMERIC,
    "amountVES" NUMERIC,
    "exchangeRate" NUMERIC,
    date TIMESTAMP WITH TIME ZONE,
    number TEXT,
    "clientName" TEXT,
    notes TEXT,
    "companyId" BIGINT,
    "branchId" BIGINT,
    "categoryId" BIGINT,
    "subcategoryId" BIGINT,
    "companyAccountId" BIGINT,
    "createdAt" TIMESTAMP WITH TIME ZONE,
    "companyName" TEXT,
    "companyGroupId" BIGINT,
    "registeredByName" TEXT,
    "categoryName" TEXT,
    "subcategoryName" TEXT,
    "branchName" TEXT,
    "accountCode" TEXT,
    "accountName" TEXT,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
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
        ga.name as "accountName",
        count(*) OVER() AS total_count
    FROM "Income" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    LEFT JOIN "User" u ON i."registeredById" = u.id
    LEFT JOIN "Category" cat ON i."categoryId" = cat.id
    LEFT JOIN "Subcategory" sub ON i."subcategoryId" = sub.id
    LEFT JOIN "Branch" br ON i."branchId" = br.id
    LEFT JOIN "CompanyAccount" ca ON i."companyAccountId" = ca.id
    LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id
    WHERE 
        (p_company_id IS NULL OR i."companyId" = p_company_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id) AND
        (p_search IS NULL OR p_search = '' OR i.number ILIKE '%' || p_search || '%' OR i."clientName" ILIKE '%' || p_search || '%')
    ORDER BY i.date DESC, i.id DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 3. Presupuestos
DROP FUNCTION IF EXISTS rpc_get_budget_list;
CREATE OR REPLACE FUNCTION rpc_get_budget_list(
    p_company_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_offset INT DEFAULT 0,
    p_branch_id BIGINT DEFAULT NULL
) RETURNS TABLE (
    id BIGINT,
    name TEXT,
    "initialDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    status "BudgetStatus",
    "amountLimitUSD" NUMERIC,
    "companyId" BIGINT,
    "branchId" BIGINT,
    "createdAt" TIMESTAMP WITH TIME ZONE,
    "companyName" TEXT,
    "companyGroupId" BIGINT,
    "branchName" TEXT,
    "totalAllocated" NUMERIC,
    "totalConsumedUSD" NUMERIC,
    "totalConsumedVES" NUMERIC,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
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
        COALESCE(alloc.total_allocated, 0)::NUMERIC as "totalAllocated",
        COALESCE(alloc.total_consumed_usd, 0)::NUMERIC as "totalConsumedUSD",
        COALESCE(alloc.total_consumed_ves, 0)::NUMERIC as "totalConsumedVES",
        count(*) OVER() AS total_count
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
    ) alloc ON b.id = alloc."budgetId"
    WHERE 
        (p_company_id IS NULL OR b."companyId" = p_company_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id) AND
        (p_branch_id IS NULL OR b."branchId" = p_branch_id) AND
        (p_search IS NULL OR p_search = '' OR b.name ILIKE '%' || p_search || '%')
    ORDER BY b."initialDate" DESC, b.id DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
