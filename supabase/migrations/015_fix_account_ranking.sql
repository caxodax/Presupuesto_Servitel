-- Migración 015: Corregir RPC de Ranking de Cuentas Contables tras eliminar AccountingAccount

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
        ga.code::TEXT as code,
        ga.name::TEXT as name,
        COALESCE(SUM(a."consumedUSD"), 0)::NUMERIC as consumed
    FROM "BudgetAllocation" a
    INNER JOIN "Budget" b ON a."budgetId" = b.id
    LEFT JOIN "CompanyAccount" ca ON a."companyAccountId" = ca.id
    LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id
    LEFT JOIN "Company" c ON b."companyId" = c.id
    WHERE 
        (p_company_id IS NULL OR b."companyId" = p_company_id) AND
        (p_branch_id IS NULL OR b."branchId" = p_branch_id) AND
        (p_budget_id IS NULL OR b.id = p_budget_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id)
    GROUP BY ga.code, ga.name
    HAVING COALESCE(SUM(a."consumedUSD"), 0) > 0
    ORDER BY consumed DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
