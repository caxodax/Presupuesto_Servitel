-- Migración 013: Optimización de Reportes, Actividad Reciente e Índices Avanzados

-- 1. RPC: Resumen general para reporte consolidado
CREATE OR REPLACE FUNCTION public.rpc_report_summary(
  p_company_id BIGINT DEFAULT NULL,
  p_branch_id BIGINT DEFAULT NULL,
  p_group_id BIGINT DEFAULT NULL,
  p_supplier_name TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  total_budget NUMERIC,
  total_consumed NUMERIC,
  execution_percentage NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH income_sum AS (
    SELECT COALESCE(SUM(i."amountUSD"), 0) AS total
    FROM "Income" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    WHERE (p_supplier_name IS NULL OR p_supplier_name = '') -- Los ingresos no tienen proveedor, si se busca por proveedor, el total es 0
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR i."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
  ),
  expense_sum AS (
    SELECT COALESCE(SUM(i."amountUSD"), 0) AS total
    FROM "Invoice" i
    LEFT JOIN "BudgetAllocation" ba ON ba.id = i."allocationId"
    LEFT JOIN "Budget" b ON b.id = ba."budgetId"
    LEFT JOIN "Company" c ON i."companyId" = c.id
    WHERE i."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_supplier_name IS NULL OR p_supplier_name = '' OR i."supplierName" ILIKE '%' || p_supplier_name || '%')
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
  ),
  budget_sum AS (
    SELECT
      COALESCE(SUM(ba."amountUSD"), 0) AS total_budget,
      COALESCE(SUM(ba."consumedUSD"), 0) AS total_consumed
    FROM "BudgetAllocation" ba
    JOIN "Budget" b ON b.id = ba."budgetId"
    LEFT JOIN "Company" c ON b."companyId" = c.id
    WHERE (p_company_id IS NULL OR b."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
  )
  SELECT
    inc.total AS total_income,
    exp.total AS total_expenses,
    inc.total - exp.total AS net_balance,
    bud.total_budget,
    bud.total_consumed,
    CASE
      WHEN bud.total_budget > 0 THEN ROUND((bud.total_consumed / bud.total_budget) * 100, 2)
      ELSE 0
    END AS execution_percentage
  FROM income_sum inc, expense_sum exp, budget_sum bud;
$$;


-- 2. RPC: Flujo diario para gráficos consolidados
CREATE OR REPLACE FUNCTION public.rpc_report_daily_flow(
  p_company_id BIGINT DEFAULT NULL,
  p_branch_id BIGINT DEFAULT NULL,
  p_group_id BIGINT DEFAULT NULL,
  p_supplier_name TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  day DATE,
  income NUMERIC,
  expenses NUMERIC,
  net NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH days AS (
    SELECT generate_series(
      COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days'),
      COALESCE(p_date_to, CURRENT_DATE),
      INTERVAL '1 day'
    )::date AS day
  ),
  incomes AS (
    SELECT i."date" AS day, SUM(i."amountUSD") AS amount
    FROM "Income" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    WHERE (p_supplier_name IS NULL OR p_supplier_name = '')
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR i."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    GROUP BY i."date"
  ),
  expenses AS (
    SELECT inv."date" AS day, SUM(inv."amountUSD") AS amount
    FROM "Invoice" inv
    LEFT JOIN "BudgetAllocation" ba ON ba.id = inv."allocationId"
    LEFT JOIN "Budget" b ON b.id = ba."budgetId"
    LEFT JOIN "Company" c ON inv."companyId" = c.id
    WHERE inv."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR inv."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_supplier_name IS NULL OR p_supplier_name = '' OR inv."supplierName" ILIKE '%' || p_supplier_name || '%')
      AND (p_date_from IS NULL OR inv."date" >= p_date_from)
      AND (p_date_to IS NULL OR inv."date" <= p_date_to)
    GROUP BY inv."date"
  )
  SELECT
    d.day,
    COALESCE(i.amount, 0) AS income,
    COALESCE(e.amount, 0) AS expenses,
    COALESCE(i.amount, 0) - COALESCE(e.amount, 0) AS net
  FROM days d
  LEFT JOIN incomes i ON i.day = d.day
  LEFT JOIN expenses e ON e.day = d.day
  ORDER BY d.day;
$$;


-- 3. RPC: Análisis consolidado por cuenta contable
CREATE OR REPLACE FUNCTION public.rpc_report_account_analysis(
  p_company_id BIGINT DEFAULT NULL,
  p_group_id BIGINT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  company_account_id BIGINT,
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  invoice_count BIGINT,
  total_expenses NUMERIC,
  total_income NUMERIC,
  net_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH expenses AS (
    SELECT
      i."companyAccountId",
      COUNT(*) AS invoice_count,
      SUM(i."amountUSD") AS total_expenses
    FROM "Invoice" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    WHERE i."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    GROUP BY i."companyAccountId"
  ),
  incomes AS (
    SELECT
      i."companyAccountId",
      SUM(i."amountUSD") AS total_income
    FROM "Income" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    WHERE (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    GROUP BY i."companyAccountId"
  )
  SELECT
    ca.id AS company_account_id,
    ga.code AS account_code,
    COALESCE(ca."customName", ga.name) AS account_name,
    ga.type::text AS account_type,
    COALESCE(e.invoice_count, 0) AS invoice_count,
    COALESCE(e.total_expenses, 0) AS total_expenses,
    COALESCE(inc.total_income, 0) AS total_income,
    COALESCE(inc.total_income, 0) - COALESCE(e.total_expenses, 0) AS net_amount
  FROM "CompanyAccount" ca
  JOIN "GlobalAccount" ga ON ga.id = ca."globalAccountId"
  LEFT JOIN expenses e ON e."companyAccountId" = ca.id
  LEFT JOIN incomes inc ON inc."companyAccountId" = ca.id
  LEFT JOIN "Company" c ON ca."companyId" = c.id
  WHERE (p_company_id IS NULL OR ca."companyId" = p_company_id)
    AND (p_group_id IS NULL OR c."groupId" = p_group_id)
    AND ca."isActive" = true
  ORDER BY ABS(COALESCE(inc.total_income, 0) - COALESCE(e.total_expenses, 0)) DESC;
$$;


-- 4. RPC: Desglose consolidado (Empresa > Sucursal > Periodo)
CREATE OR REPLACE FUNCTION public.rpc_report_breakdown(
  p_company_id BIGINT DEFAULT NULL,
  p_branch_id BIGINT DEFAULT NULL,
  p_group_id BIGINT DEFAULT NULL,
  p_supplier_name TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  company TEXT,
  branch TEXT,
  period TEXT,
  income NUMERIC,
  expense NUMERIC,
  balance NUMERIC,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH combined_flow AS (
    -- Ingresos
    SELECT 
      c.name AS company,
      br.name AS branch,
      TO_CHAR(i."date", 'YYYY-MM') AS period,
      i."amountUSD" AS income,
      0::numeric AS expense
    FROM "Income" i
    LEFT JOIN "Company" c ON i."companyId" = c.id
    LEFT JOIN "Branch" br ON i."branchId" = br.id
    WHERE (p_supplier_name IS NULL OR p_supplier_name = '')
      AND (p_company_id IS NULL OR i."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR i."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_date_from IS NULL OR i."date" >= p_date_from)
      AND (p_date_to IS NULL OR i."date" <= p_date_to)
    
    UNION ALL
    
    -- Egresos
    SELECT 
      c.name AS company,
      br.name AS branch,
      TO_CHAR(inv."date", 'YYYY-MM') AS period,
      0::numeric AS income,
      inv."amountUSD" AS expense
    FROM "Invoice" inv
    LEFT JOIN "BudgetAllocation" ba ON ba.id = inv."allocationId"
    LEFT JOIN "Budget" b ON b.id = ba."budgetId"
    LEFT JOIN "Branch" br ON b."branchId" = br.id
    LEFT JOIN "Company" c ON inv."companyId" = c.id
    WHERE inv."status" <> 'CANCELLED'
      AND (p_company_id IS NULL OR inv."companyId" = p_company_id)
      AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      AND (p_group_id IS NULL OR c."groupId" = p_group_id)
      AND (p_supplier_name IS NULL OR p_supplier_name = '' OR inv."supplierName" ILIKE '%' || p_supplier_name || '%')
      AND (p_date_from IS NULL OR inv."date" >= p_date_from)
      AND (p_date_to IS NULL OR inv."date" <= p_date_to)
  )
  SELECT 
    company::text,
    COALESCE(branch, 'Sede Central / Global')::text AS branch,
    period::text,
    SUM(income) AS income,
    SUM(expense) AS expense,
    SUM(income) - SUM(expense) AS balance,
    CASE 
      WHEN SUM(income) - SUM(expense) >= 0 THEN 'GAIN'::text
      ELSE 'LOSS'::text
    END AS status
  FROM combined_flow
  GROUP BY company, branch, period
  ORDER BY period DESC;
$$;


-- 5. RPC: Eficiencia presupuestaria consolidada (Top 5)
CREATE OR REPLACE FUNCTION public.rpc_report_budget_efficiency(
  p_company_id BIGINT,
  p_branch_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  name TEXT,
  budget NUMERIC,
  executed NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(ca."customName", ga.name)::text as name,
    SUM(ba."amountUSD") as budget,
    SUM(ba."consumedUSD") as executed
  FROM "BudgetAllocation" ba
  JOIN "Budget" b ON b.id = ba."budgetId"
  LEFT JOIN "CompanyAccount" ca ON ba."companyAccountId" = ca.id
  LEFT JOIN "GlobalAccount" ga ON ca."globalAccountId" = ga.id
  WHERE b."companyId" = p_company_id
    AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
  GROUP BY COALESCE(ca."customName", ga.name)
  HAVING SUM(ba."amountUSD") > 0
  ORDER BY (SUM(ba."consumedUSD") / SUM(ba."amountUSD")) DESC
  LIMIT 5;
$$;


-- 6. RPC: Reporte de Árbol Jerárquico Financiero (P&L Bubble-Up)
CREATE OR REPLACE FUNCTION public.rpc_financial_tree_report(
  p_company_id BIGINT,
  p_branch_id BIGINT DEFAULT NULL,
  p_budget_id BIGINT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  global_id BIGINT,
  code TEXT,
  name TEXT,
  type TEXT,
  parent_id BIGINT,
  level INTEGER,
  is_movement BOOLEAN,
  budget NUMERIC,
  executed NUMERIC,
  available NUMERIC,
  percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  -- 1. Obtener los montos directos para cada GlobalAccount
  leaf_amounts AS (
    SELECT 
      ga.id as global_account_id,
      COALESCE(SUM(al.budget), 0) as direct_budget,
      COALESCE(SUM(al.executed), 0) as direct_executed
    FROM "GlobalAccount" ga
    LEFT JOIN "CompanyAccount" ca ON ca."globalAccountId" = ga.id AND ca."companyId" = p_company_id
    LEFT JOIN (
      -- Asignaciones de presupuesto
      SELECT 
        ba."companyAccountId",
        SUM(ba."amountUSD") as budget,
        SUM(ba."consumedUSD") as executed
      FROM "BudgetAllocation" ba
      JOIN "Budget" b ON b.id = ba."budgetId"
      WHERE b."companyId" = p_company_id
        AND (p_budget_id IS NULL OR ba."budgetId" = p_budget_id)
        AND (p_branch_id IS NULL OR b."branchId" = p_branch_id)
      GROUP BY ba."companyAccountId"
      
      UNION ALL
      
      -- Ingresos (ejecutado directo)
      SELECT 
        inc."companyAccountId",
        0::numeric as budget,
        SUM(inc."amountUSD") as executed
      FROM "Income" inc
      WHERE inc."companyId" = p_company_id
        AND (p_branch_id IS NULL OR inc."branchId" = p_branch_id)
        AND (p_date_from IS NULL OR inc."date" >= p_date_from)
        AND (p_date_to IS NULL OR inc."date" <= p_date_to)
      GROUP BY inc."companyAccountId"
    ) al ON al."companyAccountId" = ca.id
    GROUP BY ga.id
  ),
  -- 2. CTE recursiva para acumular valores de hijos a padres
  accumulated_tree AS (
    -- Ancla: Comenzar por las hojas
    SELECT 
      ga.id,
      ga.code,
      ga.name,
      ga.type::text as type,
      ga."parentId",
      ga.level,
      ga."isMovementAccount",
      COALESCE(la.direct_budget, 0) as budget,
      COALESCE(la.direct_executed, 0) as executed
    FROM "GlobalAccount" ga
    LEFT JOIN leaf_amounts la ON la.global_account_id = ga.id
    
    UNION ALL
    
    -- Paso recursivo: Mover el acumulado hacia el padre
    SELECT 
      p.id,
      p.code,
      p.name,
      p.type::text as type,
      p."parentId",
      p.level,
      p."isMovementAccount",
      c.budget,
      c.executed
    FROM accumulated_tree c
    JOIN "GlobalAccount" p ON c."parentId" = p.id
  ),
  -- 3. Agrupar los acumulados por cada cuenta única
  aggregated_tree AS (
    SELECT 
      t.id as global_id,
      t.code,
      t.name,
      t.type,
      t."parentId" as parent_id,
      t.level,
      t."isMovementAccount" as is_movement,
      SUM(t.budget) as total_budget,
      SUM(t.executed) as total_executed
    FROM accumulated_tree t
    GROUP BY t.id, t.code, t.name, t.type, t."parentId", t.level, t."isMovementAccount"
  )
  -- 4. Filtrar nodos vacíos y calcular campos derivados
  SELECT 
    a.global_id,
    a.code::text,
    a.name::text,
    a.type,
    a.parent_id,
    a.level,
    a.is_movement,
    a.total_budget as budget,
    a.total_executed as executed,
    CASE 
      WHEN a.type = 'INCOME' THEN a.total_executed - a.total_budget
      ELSE a.total_budget - a.total_executed
    END as available,
    CASE 
      WHEN a.total_budget > 0 THEN (a.total_executed / a.total_budget) * 100
      WHEN a.type = 'INCOME' AND a.total_executed > 0 THEN 100::numeric
      ELSE 0::numeric
    END as percent
  FROM aggregated_tree a
  WHERE a.total_budget <> 0 OR a.total_executed <> 0
  ORDER BY a.code;
END;
$$;


-- 7. Vista: Actividad Reciente Simplificada
CREATE OR REPLACE VIEW public.recent_activity_view AS
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
LEFT JOIN "Branch" br ON br.id = b."branchId";


-- 8. Índices Avanzados Compuestos y Estratégicos
CREATE INDEX IF NOT EXISTS "idx_invoice_company_date_status" ON "Invoice"("companyId", "date" DESC, "status");
CREATE INDEX IF NOT EXISTS "idx_invoice_company_created" ON "Invoice"("companyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_invoice_allocation" ON "Invoice"("allocationId");
CREATE INDEX IF NOT EXISTS "idx_invoice_company_account" ON "Invoice"("companyAccountId");

CREATE INDEX IF NOT EXISTS "idx_income_company_date" ON "Income"("companyId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_income_branch_date" ON "Income"("branchId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_income_company_account" ON "Income"("companyAccountId");

CREATE INDEX IF NOT EXISTS "idx_budget_company_branch_status" ON "Budget"("companyId", "branchId", "status");
CREATE INDEX IF NOT EXISTS "idx_budget_branch_status_dates" ON "Budget"("branchId", "status", "initialDate", "endDate");

CREATE INDEX IF NOT EXISTS "idx_budget_allocation_budget" ON "BudgetAllocation"("budgetId");
CREATE INDEX IF NOT EXISTS "idx_budget_allocation_company_account" ON "BudgetAllocation"("companyAccountId");
