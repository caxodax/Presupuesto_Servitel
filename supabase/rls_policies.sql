-- Script: Políticas RLS para Supabase
-- Establece aislamiento multiempresa y permisos basados en roles.

-- 1. Funciones Helper para RLS (SECURITY DEFINER para poder leer la tabla User sin restricciones recursivas)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text AS $$
  SELECT role::text FROM public."User" WHERE "authId" = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_user_company_id()
RETURNS bigint AS $$
  SELECT "companyId" FROM public."User" WHERE "authId" = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS bigint AS $$
  SELECT id FROM public."User" WHERE "authId" = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Asegurar que RLS esté activo en todas las tablas
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subcategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetAdjustment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Income" ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS POR TABLA

-- === Company ===
CREATE POLICY "SuperAdmins can do everything on Company" ON "Company"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view their own Company" ON "Company"
FOR SELECT USING (id = public.get_auth_user_company_id());

-- === Branch ===
CREATE POLICY "SuperAdmins can do everything on Branch" ON "Branch"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view branches of their company" ON "Branch"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins can manage branches of their company" ON "Branch"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

-- === User ===
CREATE POLICY "SuperAdmins can do everything on User" ON "User"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view other users in their company" ON "User"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins can manage users in their company" ON "User"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

CREATE POLICY "Users can update their own profile" ON "User"
FOR UPDATE USING ("authId" = auth.uid());

-- === Category ===
CREATE POLICY "SuperAdmins can do everything on Category" ON "Category"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view categories of their company" ON "Category"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins can manage categories" ON "Category"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

-- === Subcategory ===
CREATE POLICY "SuperAdmins can do everything on Subcategory" ON "Subcategory"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view subcategories of their company" ON "Subcategory"
FOR SELECT USING (
  "categoryId" IN (SELECT id FROM "Category" WHERE "companyId" = public.get_auth_user_company_id())
);

CREATE POLICY "CompanyAdmins can manage subcategories" ON "Subcategory"
FOR ALL USING (
  "categoryId" IN (SELECT id FROM "Category" WHERE "companyId" = public.get_auth_user_company_id()) AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

-- === Budget ===
CREATE POLICY "SuperAdmins can do everything on Budget" ON "Budget"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view budgets of their company" ON "Budget"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins can manage budgets" ON "Budget"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

-- === BudgetAllocation ===
CREATE POLICY "SuperAdmins can do everything on BudgetAllocation" ON "BudgetAllocation"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view allocations of their company" ON "BudgetAllocation"
FOR SELECT USING (
  "budgetId" IN (SELECT id FROM "Budget" WHERE "companyId" = public.get_auth_user_company_id())
);

CREATE POLICY "CompanyAdmins can manage allocations" ON "BudgetAllocation"
FOR ALL USING (
  "budgetId" IN (SELECT id FROM "Budget" WHERE "companyId" = public.get_auth_user_company_id()) AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

-- === BudgetAdjustment ===
CREATE POLICY "SuperAdmins can do everything on BudgetAdjustment" ON "BudgetAdjustment"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view adjustments of their company" ON "BudgetAdjustment"
FOR SELECT USING (
  "allocationId" IN (
    SELECT id FROM "BudgetAllocation" WHERE "budgetId" IN (
      SELECT id FROM "Budget" WHERE "companyId" = public.get_auth_user_company_id()
    )
  )
);

CREATE POLICY "CompanyAdmins and Operators can manage adjustments" ON "BudgetAdjustment"
FOR ALL USING (
  "allocationId" IN (
    SELECT id FROM "BudgetAllocation" WHERE "budgetId" IN (
      SELECT id FROM "Budget" WHERE "companyId" = public.get_auth_user_company_id()
    )
  ) AND 
  public.get_auth_user_role() IN ('COMPANY_ADMIN', 'OPERATOR')
);

-- === Invoice ===
CREATE POLICY "SuperAdmins can do everything on Invoice" ON "Invoice"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view invoices of their company" ON "Invoice"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins and Operators can manage invoices" ON "Invoice"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() IN ('COMPANY_ADMIN', 'OPERATOR')
);

-- === AuditLog ===
CREATE POLICY "SuperAdmins can do everything on AuditLog" ON "AuditLog"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view audit logs of their company" ON "AuditLog"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins and Operators can insert audit logs" ON "AuditLog"
FOR INSERT WITH CHECK (
  "companyId" = public.get_auth_user_company_id()
);

-- === Alert ===
CREATE POLICY "SuperAdmins can do everything on Alert" ON "Alert"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view alerts of their company" ON "Alert"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins can manage alerts" ON "Alert"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() = 'COMPANY_ADMIN'
);

-- === Income ===
CREATE POLICY "SuperAdmins can do everything on Income" ON "Income"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Users can view incomes of their company" ON "Income"
FOR SELECT USING ("companyId" = public.get_auth_user_company_id());

CREATE POLICY "CompanyAdmins and Operators can manage incomes" ON "Income"
FOR ALL USING (
  "companyId" = public.get_auth_user_company_id() AND 
  public.get_auth_user_role() IN ('COMPANY_ADMIN', 'OPERATOR')
);

-- === ExchangeRate ===
ALTER TABLE "ExchangeRate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exchange rates" ON "ExchangeRate"
FOR SELECT USING (true);

CREATE POLICY "SuperAdmins can manage exchange rates" ON "ExchangeRate"
FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');
