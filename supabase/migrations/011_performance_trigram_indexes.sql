-- Migración 011: Habilitar extensión trigram y crear índices GIN para búsquedas ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices trigram GIN para Invoice (Facturas)
CREATE INDEX IF NOT EXISTS "idx_invoice_supplier_trgm"
ON "Invoice" USING gin ("supplierName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_invoice_number_trgm"
ON "Invoice" USING gin ("number" gin_trgm_ops);

-- Índices trigram GIN para Income (Ingresos)
CREATE INDEX IF NOT EXISTS "idx_income_client_name_trgm"
ON "Income" USING gin ("clientName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_income_number_trgm"
ON "Income" USING gin ("number" gin_trgm_ops);

-- Índices trigram GIN para Budget (Presupuesto)
CREATE INDEX IF NOT EXISTS "idx_budget_name_trgm"
ON "Budget" USING gin ("name" gin_trgm_ops);

-- Índices trigram GIN para GlobalAccount (Catálogo Contable)
CREATE INDEX IF NOT EXISTS "idx_global_account_name_trgm"
ON "GlobalAccount" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_global_account_code_trgm"
ON "GlobalAccount" USING gin ("code" gin_trgm_ops);
