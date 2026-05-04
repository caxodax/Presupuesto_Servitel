-- Script: Optimizaciones de Índices para Rendimiento
-- Objetivo: Acelerar consultas de filtrado frecuente por empresa, sucursal, presupuesto y estado.

-- 1. Empresas y Grupos
CREATE INDEX IF NOT EXISTS idx_company_group_id ON "Company" ("groupId");

-- 2. Presupuestos y Alocaciones
CREATE INDEX IF NOT EXISTS idx_budget_branch_status ON "Budget" ("branchId", "status");
CREATE INDEX IF NOT EXISTS idx_allocation_budget_cat ON "BudgetAllocation" ("budgetId", "categoryId");
CREATE INDEX IF NOT EXISTS idx_allocation_subcategory ON "BudgetAllocation" ("subcategoryId");

-- 3. Documentos Financieros (Facturas e Ingresos)
CREATE INDEX IF NOT EXISTS idx_invoice_allocation_id ON "Invoice" ("allocationId");
CREATE INDEX IF NOT EXISTS idx_invoice_registered_by ON "Invoice" ("registeredById");
CREATE INDEX IF NOT EXISTS idx_income_company_branch ON "Income" ("companyId", "branchId");
CREATE INDEX IF NOT EXISTS idx_income_category ON "Income" ("categoryId");

-- 4. Otros Catálogos y Utilidades
CREATE INDEX IF NOT EXISTS idx_category_company_active ON "Category" ("companyId", "isActive");
CREATE INDEX IF NOT EXISTS idx_alert_company_unread ON "Alert" ("companyId", "isRead");

-- 5. Auditoría Avanzada
-- Índice compuesto para búsquedas por recurso específico
CREATE INDEX IF NOT EXISTS idx_audit_resource ON "AuditLog" ("entity", "entityId");
