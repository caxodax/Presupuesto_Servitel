-- Script de inicialización de Base de Datos para Supabase (PostgreSQL)
-- Generado para: Presupuesto Servitel
-- Este script crea las tablas, tipos (enums) e índices necesarios.

-- 1. EXTENSIONES (Habilita la generación de IDs aleatorios)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS (Tipos de datos personalizados)
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATOR', 'AUDITOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BudgetPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('REGISTERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertType" AS ENUM ('BUDGET_EXCEEDED', 'ADJUSTMENT_MADE', 'SYSTEM_WARNING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLAS

-- Empresas
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sucursales
CREATE TABLE IF NOT EXISTS "Branch" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuarios
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY, -- Se recomienda usar el ID de auth.users de Supabase
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT, -- Solo si no usas Supabase Auth directamente
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL,
    "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("name", "companyId")
);

-- Subcategorías
CREATE TABLE IF NOT EXISTS "Subcategory" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("name", "categoryId")
);

-- Presupuestos (Maestros)
CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "type" "BudgetPeriodType" NOT NULL DEFAULT 'MONTHLY',
    "initialDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "amountLimitUSD" DECIMAL(19,4) NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "branchId" TEXT NOT NULL REFERENCES "Branch"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alocaciones de Presupuesto (Detalle por categoría)
CREATE TABLE IF NOT EXISTS "BudgetAllocation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "budgetId" TEXT NOT NULL REFERENCES "Budget"("id") ON DELETE CASCADE,
    "categoryId" TEXT NOT NULL REFERENCES "Category"("id"),
    "subcategoryId" TEXT REFERENCES "Subcategory"("id"),
    "amountUSD" DECIMAL(19,4) NOT NULL,
    "amountVES" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "consumedUSD" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "consumedVES" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("budgetId", "categoryId", "subcategoryId")
);

-- Ajustes de Presupuesto
CREATE TABLE IF NOT EXISTS "BudgetAdjustment" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "allocationId" TEXT NOT NULL REFERENCES "BudgetAllocation"("id") ON DELETE CASCADE,
    "reason" TEXT NOT NULL,
    "amountUSD" DECIMAL(19,4) NOT NULL,
    "amountVES" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "recordedById" TEXT NOT NULL REFERENCES "User"("id"),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Facturas
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "number" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL REFERENCES "BudgetAllocation"("id") ON DELETE RESTRICT,
    "amountUSD" DECIMAL(19,4) NOT NULL,
    "amountVES" DECIMAL(19,4) NOT NULL,
    "exchangeRate" DECIMAL(19,4) NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "registeredById" TEXT NOT NULL REFERENCES "User"("id"),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'REGISTERED',
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoría
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT REFERENCES "Company"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES "User"("id"),
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alertas
CREATE TABLE IF NOT EXISTS "Alert" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_budget_company_dates ON "Budget" ("companyId", "initialDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_invoice_company_date ON "Invoice" ("companyId", "date");
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON "AuditLog" ("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_branch_company ON "Branch" ("companyId");
CREATE INDEX IF NOT EXISTS idx_user_company ON "User" ("companyId");

-- 5. SEGURIDAD (Habilitar RLS)
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
