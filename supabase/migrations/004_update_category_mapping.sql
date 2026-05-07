-- ============================================================
-- Migración: Actualizar Mapeo de Categorías a Cuentas (Fase 4)
-- Fecha: 2026-05-05
-- Propósito: Vincular categorías legacy con CompanyAccount.
-- ============================================================

ALTER TABLE "CategoryAccountMapping" ADD COLUMN IF NOT EXISTS "companyAccountId" BIGINT REFERENCES "CompanyAccount"("id") ON DELETE CASCADE;

-- Backfill companyAccountId en CategoryAccountMapping
DO $$
BEGIN
    UPDATE "CategoryAccountMapping" cam
    SET "companyAccountId" = ca.id
    FROM "AccountingAccount" aa
    JOIN "CompanyAccount" ca ON ca."companyId" = aa."companyId" AND ca."globalAccountId" = (SELECT id FROM "GlobalAccount" WHERE code = aa.code)
    WHERE cam."accountId" = aa.id;
END $$;
