-- Script: Vistas de Rendimiento
-- Objetivo: Pre-calcular métricas comunes para evitar joins complejos y procesamiento en el servidor de apps.

-- Vista de Resumen de Presupuesto por Sucursal
-- Proporciona totales de límite, asignación y consumo por sucursal/presupuesto.
CREATE OR REPLACE VIEW vw_branch_budget_summary AS
SELECT 
    b.id as budget_id,
    b.name as budget_name,
    b."companyId",
    b."branchId",
    br.name as branch_name,
    b."amountLimitUSD" as hard_limit,
    COALESCE(SUM(ba."amountUSD"), 0) as total_allocated,
    COALESCE(SUM(ba."consumedUSD"), 0) as total_consumed_usd,
    COALESCE(SUM(ba."consumedVES"), 0) as total_consumed_ves,
    CASE 
        WHEN b."amountLimitUSD" > 0 THEN (COALESCE(SUM(ba."consumedUSD"), 0) / b."amountLimitUSD") * 100 
        ELSE 0 
    END as execution_percentage
FROM "Budget" b
JOIN "Branch" br ON b."branchId" = br.id
LEFT JOIN "BudgetAllocation" ba ON b.id = ba."budgetId"
GROUP BY b.id, br.id, b.name, b."companyId", b."branchId", br.name, b."amountLimitUSD";

-- Vista de Actividad Reciente Simplificada
-- Aplana las relaciones para auditoría rápida en el dashboard.
CREATE OR REPLACE VIEW vw_recent_activity_flat AS
SELECT 
    i.id,
    i.number as invoice_number,
    i."supplierName",
    i."amountUSD",
    i.date,
    i."companyId",
    c.name as company_name,
    u.name as user_name,
    cat.name as category_name,
    br.name as branch_name
FROM "Invoice" i
JOIN "Company" c ON i."companyId" = c.id
JOIN "User" u ON i."registeredById" = u.id
JOIN "BudgetAllocation" ba ON i."allocationId" = ba.id
JOIN "Category" cat ON ba."categoryId" = cat.id
JOIN "Budget" bud ON ba."budgetId" = bud.id
JOIN "Branch" br ON bud."branchId" = br.id;
