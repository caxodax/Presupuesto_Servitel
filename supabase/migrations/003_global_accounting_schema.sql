-- ============================================================
-- Migración: Plan de Cuentas Global y Activación por Empresa (Fase 2)
-- Fecha: 2026-05-05
-- Propósito: Centralizar el catálogo de cuentas y permitir activación multi-empresa.
-- ============================================================

-- 1. DEFENSIVO: Asegurar que AuditLog permite userId NULL (para procesos de sistema/migración)
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- 2. REDEFINIR HELPERS (Para asegurar que devuelven NULL si no hay sesión)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text AS $$
  SELECT role::text FROM public."User" WHERE auth.uid() IS NOT NULL AND "authId" = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_user_company_id()
RETURNS bigint AS $$
  SELECT "companyId" FROM public."User" WHERE auth.uid() IS NOT NULL AND "authId" = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS bigint AS $$
  SELECT id FROM public."User" WHERE auth.uid() IS NOT NULL AND "authId" = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. REDEFINIR FUNCIÓN DE AUDITORÍA (Bulletproof)
CREATE OR REPLACE FUNCTION public.log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_entity TEXT;
    v_entityId TEXT;
    v_companyId BIGINT;
    v_userId BIGINT;
    v_details JSONB;
BEGIN
    v_entity := TG_TABLE_NAME;
    v_userId := public.get_auth_user_id();
    
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_entityId := NEW.id::text;
        BEGIN EXECUTE 'SELECT $1."companyId"' INTO v_companyId USING NEW; EXCEPTION WHEN OTHERS THEN v_companyId := NULL; END;
        v_details := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_entityId := NEW.id::text;
        BEGIN EXECUTE 'SELECT $1."companyId"' INTO v_companyId USING NEW; EXCEPTION WHEN OTHERS THEN v_companyId := NULL; END;
        v_details := jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_entityId := OLD.id::text;
        BEGIN EXECUTE 'SELECT $1."companyId"' INTO v_companyId USING OLD; EXCEPTION WHEN OTHERS THEN v_companyId := NULL; END;
        v_details := row_to_json(OLD)::jsonb;
    END IF;

    IF v_userId IS NULL THEN
        v_details := v_details || jsonb_build_object('executed_by', 'SYSTEM_MIGRATION');
    END IF;

    IF v_companyId IS NULL AND v_userId IS NOT NULL THEN
        v_companyId := public.get_auth_user_company_id();
    END IF;

    INSERT INTO public."AuditLog" ("companyId", "userId", "action", "entity", "entityId", "details")
    VALUES (v_companyId, v_userId, v_action, v_entity, v_entityId, v_details);

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. EXTENDER ENUM AccountType
-- Nota: ALTER TYPE ADD VALUE no puede ejecutarse dentro de un bloque transaccional en algunas versiones de Postgres.
-- En Supabase/Postgres 15+ se puede si no se usa el valor inmediatamente en la misma transacción.
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'PROFIT';
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'DISTRIBUTION';

-- 5. TABLA: GlobalAccount (Catálogo Maestro)
CREATE TABLE IF NOT EXISTS "GlobalAccount" (
    "id" BIGSERIAL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "type" "AccountType" NOT NULL,
    "parentId" BIGINT REFERENCES "GlobalAccount"("id") ON DELETE SET NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isMovementAccount" BOOLEAN NOT NULL DEFAULT FALSE,
    "isBudgetable" BOOLEAN NOT NULL DEFAULT FALSE,
    "isExecutable" BOOLEAN NOT NULL DEFAULT FALSE,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA: CompanyAccount (Activación por Empresa)
CREATE TABLE IF NOT EXISTS "CompanyAccount" (
    "id" BIGSERIAL PRIMARY KEY,
    "companyId" BIGINT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "globalAccountId" BIGINT NOT NULL REFERENCES "GlobalAccount"("id") ON DELETE CASCADE,
    "branchId" BIGINT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "customName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "isBudgetableOverride" BOOLEAN,
    "isExecutableOverride" BOOLEAN,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "CompanyAccount_unique_activation" UNIQUE ("companyId", "globalAccountId", "branchId")
);

-- 7. TABLA TEMPORAL PARA MIGRACIÓN (Opcional, para mapear IDs antiguos a nuevos)
-- Usaremos esta lógica para no perder la relación de movimientos existentes.

-- 5. MIGRACIÓN DE DATOS EXISTENTES
DO $$
DECLARE
    rec RECORD;
    new_global_id BIGINT;
    new_company_account_id BIGINT;
BEGIN
    -- Migrar AccountingAccount a GlobalAccount (solo si el código no existe)
    FOR rec IN SELECT DISTINCT code, name, type, "parentId", level, "isBudgetable", "isExecutable", "isActive" FROM "AccountingAccount" LOOP
        INSERT INTO "GlobalAccount" (code, name, type, level, "isBudgetable", "isExecutable", "isActive")
        VALUES (rec.code, rec.name, rec.type, rec.level, rec.isBudgetable, rec.isExecutable, rec.isActive)
        ON CONFLICT (code) DO NOTHING;
    END LOOP;

    -- Re-link GlobalAccount parents (basado en códigos de AccountingAccount)
    -- Simplificación: asumimos que los códigos mantienen la jerarquía.
    
    -- Migrar activaciones a CompanyAccount
    FOR rec IN SELECT id, "companyId", code, "isActive", "isBudgetable", "isExecutable" FROM "AccountingAccount" LOOP
        SELECT id INTO new_global_id FROM "GlobalAccount" WHERE code = rec.code;
        
        IF new_global_id IS NOT NULL THEN
            INSERT INTO "CompanyAccount" ("companyId", "globalAccountId", "isActive", "isBudgetableOverride", "isExecutableOverride")
            VALUES (rec."companyId", new_global_id, rec."isActive", rec."isBudgetable", rec."isExecutable")
            ON CONFLICT ("companyId", "globalAccountId", "branchId") DO UPDATE 
            SET "isActive" = EXCLUDED."isActive"
            RETURNING id INTO new_company_account_id;
        END IF;
    END LOOP;
END $$;

-- 6. ACTUALIZAR TABLAS FINANCIERAS
ALTER TABLE "BudgetAllocation" ADD COLUMN IF NOT EXISTS "companyAccountId" BIGINT REFERENCES "CompanyAccount"("id") ON DELETE SET NULL;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "companyAccountId" BIGINT REFERENCES "CompanyAccount"("id") ON DELETE SET NULL;
ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "companyAccountId" BIGINT REFERENCES "CompanyAccount"("id") ON DELETE SET NULL;
ALTER TABLE "BudgetAdjustment" ADD COLUMN IF NOT EXISTS "companyAccountId" BIGINT REFERENCES "CompanyAccount"("id") ON DELETE SET NULL;

-- 7. BACKFILL DE companyAccountId DESDE accountId ANTIGUO
-- Nota: accountId en BudgetAllocation etc. apunta a AccountingAccount.id.
-- Necesitamos encontrar el CompanyAccount.id que corresponde a esa AccountingAccount.
DO $$
BEGIN
    -- BudgetAllocation
    UPDATE "BudgetAllocation" ba
    SET "companyAccountId" = ca.id
    FROM "AccountingAccount" aa
    JOIN "CompanyAccount" ca ON ca."companyId" = aa."companyId" AND ca."globalAccountId" = (SELECT id FROM "GlobalAccount" WHERE code = aa.code)
    WHERE ba."accountId" = aa.id;

    -- Invoice
    UPDATE "Invoice" i
    SET "companyAccountId" = ca.id
    FROM "AccountingAccount" aa
    JOIN "CompanyAccount" ca ON ca."companyId" = aa."companyId" AND ca."globalAccountId" = (SELECT id FROM "GlobalAccount" WHERE code = aa.code)
    WHERE i."accountId" = aa.id;

    -- Income
    UPDATE "Income" inc
    SET "companyAccountId" = ca.id
    FROM "AccountingAccount" aa
    JOIN "CompanyAccount" ca ON ca."companyId" = aa."companyId" AND ca."globalAccountId" = (SELECT id FROM "GlobalAccount" WHERE code = aa.code)
    WHERE inc."accountId" = aa.id;

    -- BudgetAdjustment
    UPDATE "BudgetAdjustment" badj
    SET "companyAccountId" = ca.id
    FROM "AccountingAccount" aa
    JOIN "CompanyAccount" ca ON ca."companyId" = aa."companyId" AND ca."globalAccountId" = (SELECT id FROM "GlobalAccount" WHERE code = aa.code)
    WHERE badj."accountId" = aa.id;
END $$;

-- 8. ÍNDICES
CREATE INDEX IF NOT EXISTS "idx_globalaccount_code" ON "GlobalAccount"("code");
CREATE INDEX IF NOT EXISTS "idx_companyaccount_company" ON "CompanyAccount"("companyId");
CREATE INDEX IF NOT EXISTS "idx_companyaccount_global" ON "CompanyAccount"("globalAccountId");
CREATE INDEX IF NOT EXISTS "idx_budgetallocation_companyaccount" ON "BudgetAllocation"("companyAccountId");
CREATE INDEX IF NOT EXISTS "idx_invoice_companyaccount" ON "Invoice"("companyAccountId");
CREATE INDEX IF NOT EXISTS "idx_income_companyaccount" ON "Income"("companyAccountId");

-- 9. RLS POLICIES
ALTER TABLE "GlobalAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyAccount" ENABLE ROW LEVEL SECURITY;

-- GlobalAccount: Todos ven, solo SuperAdmin edita
CREATE POLICY "Everyone can view GlobalAccount" ON "GlobalAccount" FOR SELECT USING (true);
CREATE POLICY "SuperAdmins can manage GlobalAccount" ON "GlobalAccount" FOR ALL USING (public.get_auth_user_role() = 'SUPER_ADMIN');

-- CompanyAccount: Solo ves los de tu empresa
CREATE POLICY "Users can view CompanyAccount of their company" ON "CompanyAccount" FOR SELECT USING ("companyId" = public.get_auth_user_company_id());
CREATE POLICY "Admins can manage CompanyAccount of their company" ON "CompanyAccount" FOR ALL USING ("companyId" = public.get_auth_user_company_id() AND public.get_auth_user_role() IN ('SUPER_ADMIN', 'COMPANY_ADMIN'));

-- 10. AUDIT TRIGGERS
DROP TRIGGER IF EXISTS trg_audit_global_account ON "GlobalAccount";
CREATE TRIGGER trg_audit_global_account
AFTER INSERT OR UPDATE OR DELETE ON "GlobalAccount"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_company_account ON "CompanyAccount";
CREATE TRIGGER trg_audit_company_account
AFTER INSERT OR UPDATE OR DELETE ON "CompanyAccount"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

-- 11. SEED PLAN MAESTRO PUNTO DE COBRANZA
-- (Insertaremos los niveles superiores primero para asegurar jerarquía)

DO $$
DECLARE
    id_4 BIGINT;
    id_4_1 BIGINT;
    id_4_1_2 BIGINT;
    id_4_1_2_01 BIGINT;
    
    id_5 BIGINT;
    id_5_1 BIGINT;
    id_5_1_1 BIGINT;
    id_5_1_1_01 BIGINT;
    id_5_1_1_02 BIGINT;
    id_5_1_2 BIGINT;
    id_5_1_2_02 BIGINT;
    
    id_5_2 BIGINT;
    id_5_2_1 BIGINT;
    id_5_2_1_01 BIGINT;
    id_5_2_1_02 BIGINT;
    id_5_2_1_03 BIGINT;
    
    id_5_3 BIGINT;
    id_5_3_3 BIGINT;
    id_5_3_3_01 BIGINT;
    
    id_6 BIGINT;
    id_6_1 BIGINT;
    id_6_1_1 BIGINT;
    id_6_1_1_01 BIGINT;
    id_6_1_1_02 BIGINT;
    
    id_6_2 BIGINT;
    id_6_2_1 BIGINT;
    id_6_2_1_01 BIGINT;
    id_6_2_2 BIGINT;
    id_6_2_2_01 BIGINT;
    id_6_2_2_02 BIGINT;
    id_6_2_2_03 BIGINT;
    
    id_6_3 BIGINT;
    id_6_3_1 BIGINT;
    id_6_3_1_01 BIGINT;
    
    id_6_4 BIGINT;
    id_6_4_2 BIGINT;
    id_6_4_2_01 BIGINT;
BEGIN
    -- 4 INGRESOS
    INSERT INTO "GlobalAccount" (code, name, type, level) VALUES ('4', 'INGRESOS', 'INCOME', 1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_4;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('4.1', 'INGRESOS ORDINARIOS', 'INCOME', 2, id_4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_4_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('4.1.2', 'INGRESOS POR VENTA DE INTERNET', 'INCOME', 3, id_4_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_4_1_2;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('4.1.2.01', 'SERVICIO INTERNET PRINCIPAL', 'INCOME', 4, id_4_1_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_4_1_2_01;
    
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('4.1.2.01.001', 'INGRESOS SERVICIO DE INTERNET', 'INCOME', 5, id_4_1_2_01, true, true, true),
    ('4.1.2.01.002', 'INGRESOS SERVICIO TV', 'INCOME', 5, id_4_1_2_01, true, true, true),
    ('4.1.2.01.003', 'INGRESOS POR ALQUILER DE IP', 'INCOME', 5, id_4_1_2_01, true, true, true),
    ('4.1.2.01.004', 'INGRESOS POR PROGRAMACION', 'INCOME', 5, id_4_1_2_01, true, true, true),
    ('4.1.2.01.005', 'INGRESOS POR INSTALACIONES', 'INCOME', 5, id_4_1_2_01, true, true, true),
    ('4.1.2.01.006', 'INGRESOS POR VENTA DE MATERIALES', 'INCOME', 5, id_4_1_2_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    -- 5 COSTOS
    INSERT INTO "GlobalAccount" (code, name, type, level) VALUES ('5', 'COSTOS', 'COST', 1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.1', 'TRIBUTOS', 'COST', 2, id_5) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.1.1', 'TRIBUTOS NACIONALES', 'COST', 3, id_5_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_1_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.1.1.01', 'TRIBUTOS NACIONALES', 'COST', 4, id_5_1_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_1_1_01;
    
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.1.1.01.001', 'ANTICIPO ISLR', 'COST', 5, id_5_1_1_01, true, true, true),
    ('5.1.1.01.002', 'IMPUESTO PROTECCION A LAS PENSIONES', 'COST', 5, id_5_1_1_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.1.1.02', 'TRIBUTOS DE TELECOMUNICACIONES', 'COST', 4, id_5_1_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_1_1_02;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.1.1.02.001', 'CONATEL FORMA 005', 'COST', 5, id_5_1_1_02, true, true, true),
    ('5.1.1.02.002', 'CONATEL FORMA 006', 'COST', 5, id_5_1_1_02, true, true, true),
    ('5.1.1.02.003', 'CONATEL FORMA 007', 'COST', 5, id_5_1_1_02, true, true, true),
    ('5.1.1.02.005', 'FIDETEL', 'COST', 5, id_5_1_1_02, true, true, true),
    ('5.1.1.02.006', 'CONATEL FORMA 017 INALAMBRICA', 'COST', 5, id_5_1_1_02, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.1.2', 'TRIBUTOS MUNICIPALES', 'COST', 3, id_5_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_1_2;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.1.2.02', 'TRIBUTOS MUNICIPALES', 'COST', 4, id_5_1_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_1_2_02;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.1.2.02.001', 'IMP. MUNICIPAL MUN LIBERTADOR', 'COST', 5, id_5_1_2_02, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    -- 5.2 COSTO DE PRESTACION DEL SERVICIO
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.2', 'COSTO DE PRESTACION DEL SERVICIO', 'COST', 2, id_5) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_2;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.2.1', 'COSTO DE PRESTACION DEL SERVICIO', 'COST', 3, id_5_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_2_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.2.1.01', 'COSTOS ASOCIADOS', 'COST', 4, id_5_2_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_2_1_01;
    
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.2.1.01.002', 'INSTALACION SERVICIO INTERNET', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.003', 'COMPRA CAPACIDAD BANDA ANCHA', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.006', 'CROSS CONEXIÓN', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.007', 'EQUIPOS SERVICIO INTERNET', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.008', 'POSTEADURA', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.012', 'COSTOS DE PROGRAMACION TV', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.013', 'SERVICIO DE RECURSOS IP ADICIONAL', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.014', 'ARRENDAMIENTO DE ROUTER', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.015', 'SERVICIO DE TRANSPORTE CAPACIDAD', 'COST', 5, id_5_2_1_01, true, true, true),
    ('5.2.1.01.016', 'SERVICIO DE TRANSPORTE PUERTOS OPTICOS', 'COST', 5, id_5_2_1_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.2.1.02', 'COSTO DE PERSONAL TECNICO', 'COST', 4, id_5_2_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_2_1_02;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.2.1.02.001', 'SUELDOS CORRIENTES', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.005', 'VACACIONES Y BONO VACACIONES', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.006', 'PRESTACIONES SOCIALES', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.007', 'UNIFORMES', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.008', 'BONO ALIMENTACION', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.009', 'ATENCIONES AL PERSONAL', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.010', 'I.V.S.S. / L.R.P.E.', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.011', 'FAOV', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.012', 'INCES', 'COST', 5, id_5_2_1_02, true, true, true),
    ('5.2.1.02.013', 'UTILIDADES', 'COST', 5, id_5_2_1_02, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.2.1.03', 'COSTO DE PERSONAL SOPORTE TECNICO', 'COST', 4, id_5_2_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_2_1_03;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.2.1.03.001', 'SUELDOS CORRIENTES', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.005', 'VACACIONES Y BONO VACACIONES', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.006', 'PRESTACIONES SOCIALES', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.007', 'UNIFORMES', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.008', 'BONO ALIMENTACION', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.009', 'ATENCIONES AL PERSONAL', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.010', 'I.V.S.S. / L.R.P.E.', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.011', 'FAOV', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.012', 'INCES', 'COST', 5, id_5_2_1_03, true, true, true),
    ('5.2.1.03.013', 'UTILIDADES', 'COST', 5, id_5_2_1_03, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.3', 'OTROS COSTOS', 'COST', 2, id_5) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_3;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.3.3', 'OTROS COSTOS ASOCIADOS', 'COST', 3, id_5_3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_3_3;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('5.3.3.01', 'COSTOS DIVERSOS', 'COST', 4, id_5_3_3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_5_3_3_01;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('5.3.3.01.001', 'OTROS COSTOS', 'COST', 5, id_5_3_3_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    -- 6 GASTOS
    INSERT INTO "GlobalAccount" (code, name, type, level) VALUES ('6', 'GASTOS', 'EXPENSE', 1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.1', 'GASTOS DE ADMINISTRACION', 'EXPENSE', 2, id_6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.1.1', 'GASTOS DE PERSONAL', 'EXPENSE', 3, id_6_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_1_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.1.1.01', 'GASTO DE PERSONAL ADMINISTRATIVO', 'EXPENSE', 4, id_6_1_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_1_1_01;
    
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.1.1.01.001', 'SUELDOS CORRIENTES', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.005', 'VACACIONES Y BONO VACACIONES', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.006', 'PRESTACIONES SOCIALES', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.007', 'UNIFORMES', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.008', 'BONO ALIMENTACION', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.009', 'ATENCIONES AL PERSONAL', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.010', 'I.V.S.S. / L.R.P.E.', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.011', 'FAOV', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.012', 'INCES', 'EXPENSE', 5, id_6_1_1_01, true, true, true),
    ('6.1.1.01.013', 'UTILIDADES', 'EXPENSE', 5, id_6_1_1_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.1.1.02', 'GASTOS DE PERSONAL ATENCION AL CLIENTE', 'EXPENSE', 4, id_6_1_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_1_1_02;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.1.1.02.001', 'SUELDOS CORRIENTES', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.005', 'VACACIONES Y BONO VACACIONES', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.006', 'PRESTACIONES SOCIALES', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.007', 'UNIFORMES', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.008', 'BONO ALIMENTACION', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.009', 'ATENCIONES AL PERSONAL', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.010', 'I.V.S.S. / L.R.P.E.', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.011', 'FAOV', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.012', 'INCES', 'EXPENSE', 5, id_6_1_1_02, true, true, true),
    ('6.1.1.02.013', 'UTILIDADES', 'EXPENSE', 5, id_6_1_1_02, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2', 'GASTOS DE VENTAS', 'EXPENSE', 2, id_6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2.1', 'GASTOS DE PERSONAL', 'EXPENSE', 3, id_6_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2.1.01', 'GASTO DE PERSONAL DE VENTAS', 'EXPENSE', 4, id_6_2_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2_1_01;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.2.1.01.001', 'SUELDOS CORRIENTES', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.005', 'VACACIONES Y BONO VACACIONES', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.006', 'PRESTACIONES SOCIALES', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.007', 'UNIFORMES', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.008', 'BONO ALIMENTACION', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.009', 'ATENCIONES AL PERSONAL', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.010', 'I.V.S.S. / L.R.P.E.', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.011', 'FAOV', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.012', 'INCES', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.013', 'UTILIDADES', 'EXPENSE', 5, id_6_2_1_01, true, true, true),
    ('6.2.1.01.014', 'COMISIONES SOBRE VENTAS', 'EXPENSE', 5, id_6_2_1_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2.2', 'GASTOS DE PUBLICIDAD', 'EXPENSE', 3, id_6_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2_2;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2.2.01', 'PARTICIPACION EN EVENTOS', 'EXPENSE', 4, id_6_2_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2_2_01;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.2.2.01.001', 'PARTICIPACION EN EVENTOS', 'EXPENSE', 5, id_6_2_2_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2.2.02', 'PUBLICIDAD EN MEDIOS DIGITALES', 'EXPENSE', 4, id_6_2_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2_2_02;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.2.2.02.001', 'PUBLICIDAD EN MEDIOS DIGITALES', 'EXPENSE', 5, id_6_2_2_02, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.2.2.03', 'OTROS GASTOS DE PUBLICIDAD', 'EXPENSE', 4, id_6_2_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_2_2_03;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.2.2.03.001', 'OTROS GASTOS DE PUBLICIDAD', 'EXPENSE', 5, id_6_2_2_03, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.3', 'GASTOS GENERALES', 'EXPENSE', 2, id_6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_3;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.3.1', 'GASTOS GENERALES', 'EXPENSE', 3, id_6_3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_3_1;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.3.1.01', 'GASTOS GENERALES', 'EXPENSE', 4, id_6_3_1) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_3_1_01;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.3.1.01.001', 'PAPELERIA E INSUMOS DE OFICINA', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.002', 'VIATICOS', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.003', 'GASTOS LEGALES REEMBOLSABLES', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.005', 'MANTENIMIENTO OFICINA', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.008', 'MEJORAS A LA PROPIEDAD ARRENDADA', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.010', 'ALQUILER OFICINA', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.014', 'HONORARIOS PROFESIONALES', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.015', 'GASTOS EN FACTURACION ELECTRONICA', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.016', 'GASTOS EN SISTEMA DE INFORMACION', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.022', 'GASTOS DE SEGURIDAD INDUSTRIAL', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.024', 'GASTOS VARIOS', 'EXPENSE', 5, id_6_3_1_01, true, true, true),
    ('6.3.1.01.025', 'GESTION', 'EXPENSE', 5, id_6_3_1_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.4', 'GASTOS FINANCIEROS', 'EXPENSE', 2, id_6) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_4;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.4.2', 'COMISIONES BANCARIAS', 'EXPENSE', 3, id_6_4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_4_2;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId") VALUES ('6.4.2.01', 'COMISIONES BANCARIAS', 'EXPENSE', 4, id_6_4_2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO id_6_4_2_01;
    INSERT INTO "GlobalAccount" (code, name, type, level, "parentId", "isMovementAccount", "isBudgetable", "isExecutable") VALUES 
    ('6.4.2.01.001', 'BANCO BNC (COMISIONES)', 'EXPENSE', 5, id_6_4_2_01, true, true, true),
    ('6.4.2.01.002', 'I.G.T.F.', 'EXPENSE', 5, id_6_4_2_01, true, true, true),
    ('6.4.2.01.003', 'BANCO DE VENEZUELA (COMISIONES)', 'EXPENSE', 5, id_6_4_2_01, true, true, true),
    ('6.4.2.01.004', 'BANCO DEL TESORO (COMISIONES)', 'EXPENSE', 5, id_6_4_2_01, true, true, true),
    ('6.4.2.01.005', 'BANCO BANCARIBE (COMISIONES)', 'EXPENSE', 5, id_6_4_2_01, true, true, true)
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

END $$;
