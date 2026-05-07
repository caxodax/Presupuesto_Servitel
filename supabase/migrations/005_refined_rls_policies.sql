-- ============================================================
-- Migración: RLS Refinado y Seguridad Multiempresa (Fase 8)
-- Fecha: 2026-05-05
-- Propósito: Garantizar el aislamiento total entre empresas y proteger la integridad contable.
-- ============================================================

-- 1. LIMPIEZA DE POLÍTICAS PREVIAS (Para evitar duplicados o conflictos)
DO $$
BEGIN
    -- GlobalAccount
    DROP POLICY IF EXISTS "Everyone can view GlobalAccount" ON "GlobalAccount";
    DROP POLICY IF EXISTS "SuperAdmins can manage GlobalAccount" ON "GlobalAccount";
    
    -- CompanyAccount
    DROP POLICY IF EXISTS "Users can view CompanyAccount of their company" ON "CompanyAccount";
    DROP POLICY IF EXISTS "Admins can manage CompanyAccount of their company" ON "CompanyAccount";

    -- CategoryAccountMapping
    DROP POLICY IF EXISTS "Users can view mappings of their company" ON "CategoryAccountMapping";
    DROP POLICY IF EXISTS "Admins can manage mappings of their company" ON "CategoryAccountMapping";
END $$;

-- 2. POLÍTICAS: GlobalAccount
ALTER TABLE "GlobalAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "GlobalAccount_Select" ON "GlobalAccount" FOR SELECT TO authenticated USING (true);
CREATE POLICY "GlobalAccount_Admin" ON "GlobalAccount" FOR ALL TO authenticated USING (public.get_auth_user_role() = 'SUPER_ADMIN');

-- 3. POLÍTICAS: CompanyAccount
ALTER TABLE "CompanyAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CompanyAccount_Select" ON "CompanyAccount" FOR SELECT TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAccount_Admin" ON "CompanyAccount" FOR ALL TO authenticated 
USING (
    "companyId" = public.get_auth_user_company_id() AND 
    public.get_auth_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);

-- 4. POLÍTICAS: CategoryAccountMapping
ALTER TABLE "CategoryAccountMapping" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CategoryAccountMapping_Select" ON "CategoryAccountMapping" FOR SELECT TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CategoryAccountMapping_Admin" ON "CategoryAccountMapping" FOR ALL TO authenticated 
USING (
    "companyId" = public.get_auth_user_company_id() AND 
    public.get_auth_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
);

-- 5. POLÍTICAS: BudgetAllocation
-- Nota: BudgetAllocation no tiene companyId directo, pero está vinculado a Budget.
ALTER TABLE "BudgetAllocation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BudgetAllocation_Select" ON "BudgetAllocation" FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM "Budget" b 
        WHERE b.id = "BudgetAllocation"."budgetId" 
        AND b."companyId" = public.get_auth_user_company_id()
    )
);

CREATE POLICY "BudgetAllocation_Admin" ON "BudgetAllocation" FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM "Budget" b 
        WHERE b.id = "BudgetAllocation"."budgetId" 
        AND b."companyId" = public.get_auth_user_company_id()
        AND public.get_auth_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN')
    )
);

-- 6. POLÍTICAS: Invoice
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoice_Select" ON "Invoice" FOR SELECT TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "Invoice_Insert" ON "Invoice" FOR INSERT TO authenticated 
WITH CHECK ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "Invoice_Update" ON "Invoice" FOR UPDATE TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

-- 7. POLÍTICAS: Income
ALTER TABLE "Income" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Income_Select" ON "Income" FOR SELECT TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "Income_Insert" ON "Income" FOR INSERT TO authenticated 
WITH CHECK ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "Income_Update" ON "Income" FOR UPDATE TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

-- 8. POLÍTICAS: BudgetAdjustment
ALTER TABLE "BudgetAdjustment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "BudgetAdjustment_Select" ON "BudgetAdjustment" FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM "BudgetAllocation" ba
        JOIN "Budget" b ON b.id = ba."budgetId"
        WHERE ba.id = "BudgetAdjustment"."allocationId"
        AND b."companyId" = public.get_auth_user_company_id()
    )
);

-- 9. POLÍTICAS: AuditLog
-- Solo permitir ver logs de la propia empresa (si companyId está presente)
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AuditLog_Select" ON "AuditLog" FOR SELECT TO authenticated 
USING (
    "companyId" = public.get_auth_user_company_id() OR 
    public.get_auth_user_role() = 'SUPER_ADMIN'
);

-- 10. POLÍTICAS: Branch y Budget (Refuerzo)
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch_Access" ON "Branch" FOR ALL TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());

ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Budget_Access" ON "Budget" FOR ALL TO authenticated 
USING ("companyId" = public.get_auth_user_company_id());
