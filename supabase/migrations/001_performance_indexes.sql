-- ============================================================
-- Migración: Índices de Rendimiento
-- Fecha: 2026-05-05
-- Propósito: Acelerar consultas frecuentes de la app de presupuesto.
-- Ejecutar en: Supabase SQL Editor (o via CLI: supabase db push)
-- ============================================================

-- ============================
-- INVOICE (tabla más consultada)
-- ============================
-- Filtro principal: por empresa + orden de fecha
CREATE INDEX IF NOT EXISTS idx_invoice_company_date 
  ON "Invoice"("companyId", "date" DESC);

-- Filtro de estado activo/cancelado
CREATE INDEX IF NOT EXISTS idx_invoice_company_status 
  ON "Invoice"("companyId", "status");

-- Para auditoría y activity feed (orden por createdAt)
CREATE INDEX IF NOT EXISTS idx_invoice_company_created 
  ON "Invoice"("companyId", "createdAt" DESC);

-- Búsqueda por texto (number, supplierName) — soporte para ilike
CREATE INDEX IF NOT EXISTS idx_invoice_number 
  ON "Invoice"("number");
CREATE INDEX IF NOT EXISTS idx_invoice_supplier 
  ON "Invoice"("supplierName");

-- ============================
-- INCOME
-- ============================
CREATE INDEX IF NOT EXISTS idx_income_company_date 
  ON "Income"("companyId", "date" DESC);

CREATE INDEX IF NOT EXISTS idx_income_company_branch 
  ON "Income"("companyId", "branchId");

CREATE INDEX IF NOT EXISTS idx_income_company_created 
  ON "Income"("companyId", "createdAt" DESC);

-- ============================
-- BUDGET
-- ============================
-- Filtro principal: por empresa + sucursal (dashboard KPIs)
CREATE INDEX IF NOT EXISTS idx_budget_company_branch 
  ON "Budget"("companyId", "branchId");

CREATE INDEX IF NOT EXISTS idx_budget_company 
  ON "Budget"("companyId");

-- ============================
-- BUDGETALLOCATION
-- ============================
-- Join principal desde Budget
CREATE INDEX IF NOT EXISTS idx_budgetalloc_budget 
  ON "BudgetAllocation"("budgetId");

-- Filtro por categoría (ranking dashboard)
CREATE INDEX IF NOT EXISTS idx_budgetalloc_category 
  ON "BudgetAllocation"("categoryId");

-- Join budget + category combinado
CREATE INDEX IF NOT EXISTS idx_budgetalloc_budget_category 
  ON "BudgetAllocation"("budgetId", "categoryId");

-- ============================
-- AUDITLOG
-- ============================
-- Listado por empresa + orden temporal (página /auditoria)
CREATE INDEX IF NOT EXISTS idx_auditlog_company_created 
  ON "AuditLog"("companyId", "createdAt" DESC);

-- Búsqueda por entidad (detalle de factura/ingreso)
CREATE INDEX IF NOT EXISTS idx_auditlog_entity 
  ON "AuditLog"("entity", "entityId");

-- ============================
-- BRANCH
-- ============================
-- Join desde Invoice/Income/Budget
CREATE INDEX IF NOT EXISTS idx_branch_company 
  ON "Branch"("companyId");

-- ============================
-- COMPANY
-- ============================
-- Join desde BudgetAllocation > Budget > Company
CREATE INDEX IF NOT EXISTS idx_company_group 
  ON "Company"("groupId");

-- ============================
-- USER
-- ============================
-- Lookup auth session (más crítico — cada request)
CREATE INDEX IF NOT EXISTS idx_user_authid 
  ON "User"("authId");

-- Join desde Company/Branch
CREATE INDEX IF NOT EXISTS idx_user_company 
  ON "User"("companyId");

-- ============================
-- EXCHANGERATE
-- ============================
-- Lookup por fecha (autocompletado de tasa en facturas)
CREATE INDEX IF NOT EXISTS idx_exchangerate_date 
  ON "ExchangeRate"("date" DESC);

-- ============================
-- CATEGORY
-- ============================
CREATE INDEX IF NOT EXISTS idx_category_company 
  ON "Category"("companyId");

CREATE INDEX IF NOT EXISTS idx_category_type 
  ON "Category"("type");

-- ============================
-- ALERT
-- ============================
CREATE INDEX IF NOT EXISTS idx_alert_company_created 
  ON "Alert"("companyId", "createdAt" DESC);

-- ============================================================
-- FIN DE MIGRACIÓN
-- Estimado: 12-15 índices aplicados.
-- Validar con: SELECT indexname, tablename FROM pg_indexes 
--              WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
--              ORDER BY tablename;
-- ============================================================
