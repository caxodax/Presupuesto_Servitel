-- ============================================================
-- Migración: Plan de Cuentas Contables (Prioridad 2)
-- Fecha: 2026-05-05
-- Propósito: Implementar la infraestructura para clasificación contable.
-- ============================================================

-- 1. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountType') THEN
        CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'COST', 'EXPENSE');
    END IF;
END $$;

-- 2. TABLA: AccountingAccount
CREATE TABLE IF NOT EXISTS "AccountingAccount" (
    "id" BIGSERIAL PRIMARY KEY,
    "companyId" BIGINT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" BIGINT REFERENCES "AccountingAccount"("id") ON DELETE SET NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isBudgetable" BOOLEAN NOT NULL DEFAULT FALSE,
    "isExecutable" BOOLEAN NOT NULL DEFAULT FALSE,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "AccountingAccount_code_company_unique" UNIQUE ("companyId", "code")
);

-- 3. TABLA: CategoryAccountMapping
CREATE TABLE IF NOT EXISTS "CategoryAccountMapping" (
    "id" BIGSERIAL PRIMARY KEY,
    "companyId" BIGINT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "categoryId" BIGINT NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
    "subcategoryId" BIGINT REFERENCES "Subcategory"("id") ON DELETE SET NULL,
    "accountId" BIGINT NOT NULL REFERENCES "AccountingAccount"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "CategoryAccountMapping_unique" UNIQUE ("companyId", "categoryId", "subcategoryId")
);

-- 4. MODIFICACIONES EN TABLAS EXISTENTES
-- BudgetAllocation
ALTER TABLE "BudgetAllocation" 
ADD COLUMN IF NOT EXISTS "accountId" BIGINT REFERENCES "AccountingAccount"("id") ON DELETE SET NULL,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- Invoice
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "accountId" BIGINT REFERENCES "AccountingAccount"("id") ON DELETE SET NULL,
ALTER COLUMN "allocationId" DROP NOT NULL;

-- Income
ALTER TABLE "Income" 
ADD COLUMN IF NOT EXISTS "accountId" BIGINT REFERENCES "AccountingAccount"("id") ON DELETE SET NULL,
ALTER COLUMN "categoryId" DROP NOT NULL;

-- BudgetAdjustment
ALTER TABLE "BudgetAdjustment" 
ADD COLUMN IF NOT EXISTS "accountId" BIGINT REFERENCES "AccountingAccount"("id") ON DELETE SET NULL;

-- 5. ÍNDICES DE RENDIMIENTO PARA CUENTAS
CREATE INDEX IF NOT EXISTS "idx_accountingaccount_company" ON "AccountingAccount"("companyId");
CREATE INDEX IF NOT EXISTS "idx_accountingaccount_code" ON "AccountingAccount"("code");
CREATE INDEX IF NOT EXISTS "idx_budgetallocation_account" ON "BudgetAllocation"("accountId");
CREATE INDEX IF NOT EXISTS "idx_invoice_account" ON "Invoice"("accountId");
CREATE INDEX IF NOT EXISTS "idx_income_account" ON "Income"("accountId");
CREATE INDEX IF NOT EXISTS "idx_mapping_company" ON "CategoryAccountMapping"("companyId");

-- 6. POLÍTICAS RLS PARA NUEVAS TABLAS
ALTER TABLE "AccountingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryAccountMapping" ENABLE ROW LEVEL SECURITY;

-- AccountingAccount: SuperAdmins everything
CREATE POLICY "SuperAdmins can do everything on AccountingAccount" ON "AccountingAccount"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

-- AccountingAccount: Users view their company accounts
CREATE POLICY "Users can view accounts of their company" ON "AccountingAccount"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

-- CategoryAccountMapping: SuperAdmins everything
CREATE POLICY "SuperAdmins can do everything on CategoryAccountMapping" ON "CategoryAccountMapping"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

-- CategoryAccountMapping: Users view their company mappings
CREATE POLICY "Users can view mappings of their company" ON "CategoryAccountMapping"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

-- 7. TRIGGERS PARA AUDITORÍA (reutilizando la función existente)
CREATE TRIGGER trg_audit_accounting_account
AFTER INSERT OR UPDATE OR DELETE ON "AccountingAccount"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

CREATE TRIGGER trg_audit_category_mapping
AFTER INSERT OR UPDATE OR DELETE ON "CategoryAccountMapping"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
