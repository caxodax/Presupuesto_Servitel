-- Migración 016: Corregir mismatch de tipos en rpc_get_recent_activity

DROP FUNCTION IF EXISTS rpc_get_recent_activity;

CREATE OR REPLACE FUNCTION rpc_get_recent_activity(
    p_company_id BIGINT DEFAULT NULL,
    p_branch_id BIGINT DEFAULT NULL,
    p_budget_id BIGINT DEFAULT NULL,
    p_group_id BIGINT DEFAULT NULL,
    p_limit INT DEFAULT 6
) RETURNS TABLE (
  id BIGINT,
  number TEXT,
  "supplierName" TEXT,
  "amountUSD" NUMERIC,
  date TIMESTAMP WITH TIME ZONE,
  status "InvoiceStatus",
  "companyId" BIGINT,
  "companyName" TEXT,
  "companyGroupId" BIGINT,
  "registeredByName" TEXT,
  "accountCode" TEXT,
  "accountName" TEXT,
  "budgetId" BIGINT,
  "branchId" BIGINT,
  "branchName" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
      i.id,
      i.number,
      i."supplierName",
      i."amountUSD",
      i.date,
      i.status,
      i."companyId",
      c.name AS "companyName",
      c."groupId" as "companyGroupId",
      u.name AS "registeredByName",
      ga.code AS "accountCode",
      ga.name AS "accountName",
      b.id AS "budgetId",
      br.id AS "branchId",
      br.name AS "branchName",
      i."createdAt"
    FROM "Invoice" i
    LEFT JOIN "Company" c ON c.id = i."companyId"
    LEFT JOIN "User" u ON u.id = i."registeredById"
    LEFT JOIN "CompanyAccount" ca ON ca.id = i."companyAccountId"
    LEFT JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
    LEFT JOIN "BudgetAllocation" ba ON ba.id = i."allocationId"
    LEFT JOIN "Budget" b ON b.id = ba."budgetId"
    LEFT JOIN "Branch" br ON br.id = b."branchId"
    WHERE 
        (p_company_id IS NULL OR i."companyId" = p_company_id) AND
        (p_group_id IS NULL OR c."groupId" = p_group_id) AND
        (p_budget_id IS NULL OR b.id = p_budget_id) AND
        (p_branch_id IS NULL OR br.id = p_branch_id)
    ORDER BY i."createdAt" DESC
    LIMIT p_limit;
END;
$$;
