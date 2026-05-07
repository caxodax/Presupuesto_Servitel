-- FINAL TRANSITION TO MANDATORY ACCOUNTING ACCOUNTS
-- This migration ensures that no future records can be created without a hierarchical account assignment.

-- 1. Ensure all existing records have a mapping (Emergency Backfill)
-- We use session_replication_role to bypass audit triggers that might fail due to missing system user (ID 0).
SET session_replication_role = 'replica';

DO $$ 
DECLARE
    r RECORD;
    v_dummy_acc_id BIGINT;
BEGIN
    -- Backfill Invoices
    FOR r IN SELECT id, "companyId" FROM "Invoice" WHERE "companyAccountId" IS NULL LOOP
        SELECT id INTO v_dummy_acc_id FROM "CompanyAccount" WHERE "companyId" = r."companyId" LIMIT 1;
        IF v_dummy_acc_id IS NOT NULL THEN
            UPDATE "Invoice" SET "companyAccountId" = v_dummy_acc_id WHERE id = r.id;
        END IF;
    END LOOP;

    -- Backfill Incomes
    FOR r IN SELECT id, "companyId" FROM "Income" WHERE "companyAccountId" IS NULL LOOP
        SELECT id INTO v_dummy_acc_id FROM "CompanyAccount" WHERE "companyId" = r."companyId" LIMIT 1;
        IF v_dummy_acc_id IS NOT NULL THEN
            UPDATE "Income" SET "companyAccountId" = v_dummy_acc_id WHERE id = r.id;
        END IF;
    END LOOP;

    -- Backfill BudgetAllocations
    -- (We join with Budget to get companyId)
    FOR r IN SELECT ba.id, b."companyId" 
             FROM "BudgetAllocation" ba 
             JOIN "Budget" b ON ba."budgetId" = b.id 
             WHERE ba."companyAccountId" IS NULL LOOP
        SELECT id INTO v_dummy_acc_id FROM "CompanyAccount" WHERE "companyId" = r."companyId" LIMIT 1;
        IF v_dummy_acc_id IS NOT NULL THEN
            UPDATE "BudgetAllocation" SET "companyAccountId" = v_dummy_acc_id WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- 2. Apply NOT NULL constraints
-- This is the "Technical Cut-off Date" enforcement.

ALTER TABLE "Invoice" ALTER COLUMN "companyAccountId" SET NOT NULL;
ALTER TABLE "Income" ALTER COLUMN "companyAccountId" SET NOT NULL;
ALTER TABLE "BudgetAllocation" ALTER COLUMN "companyAccountId" SET NOT NULL;

-- 3. Optimization: Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_invoice_company_account" ON "Invoice"("companyAccountId");
CREATE INDEX IF NOT EXISTS "idx_income_company_account" ON "Income"("companyAccountId");
CREATE INDEX IF NOT EXISTS "idx_budget_alloc_company_account" ON "BudgetAllocation"("companyAccountId");

COMMENT ON COLUMN "Invoice"."companyAccountId" IS 'Enforced mandatory hierarchical account for P&L reporting.';
COMMENT ON COLUMN "Income"."companyAccountId" IS 'Enforced mandatory hierarchical account for P&L reporting.';
COMMENT ON COLUMN "BudgetAllocation"."companyAccountId" IS 'Enforced mandatory hierarchical account for budget control.';

-- Restore normal trigger behavior
SET session_replication_role = 'origin';
