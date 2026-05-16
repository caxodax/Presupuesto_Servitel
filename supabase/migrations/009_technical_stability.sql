-- ============================================================
-- Migración: Estabilidad Técnica y Seguridad (Fase 9)
-- Fecha: 2026-05-16
-- Propósito: Garantizar integridad de datos, rendimiento y seguridad de archivos.
-- ============================================================

-- 1. INTEGRIDAD DE DATOS: Prevenir eliminación con historial
CREATE OR REPLACE FUNCTION public.check_movements_before_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_count BIGINT;
    v_table_name TEXT;
BEGIN
    v_table_name := TG_TABLE_NAME;

    IF v_table_name = 'CompanyAccount' THEN
        -- Verificar si la cuenta tiene facturas, ingresos o asignaciones
        SELECT COUNT(*) INTO v_count FROM "Invoice" WHERE "companyAccountId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar la cuenta porque tiene facturas asociadas. Desactívela en su lugar.'; END IF;

        SELECT COUNT(*) INTO v_count FROM "Income" WHERE "companyAccountId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar la cuenta porque tiene ingresos asociados. Desactívela en su lugar.'; END IF;

        SELECT COUNT(*) INTO v_count FROM "BudgetAllocation" WHERE "companyAccountId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar la cuenta porque está asignada a un presupuesto.'; END IF;

    ELSIF v_table_name = 'Budget' THEN
        -- Verificar si el presupuesto tiene asignaciones con movimientos
        SELECT COUNT(*) INTO v_count 
        FROM "BudgetAllocation" ba
        JOIN "Invoice" i ON i."allocationId" = ba.id
        WHERE ba."budgetId" = OLD.id;
        IF v_count > 0 THEN RAISE EXCEPTION 'No se puede eliminar el presupuesto porque tiene facturas registradas.'; END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers de prevención
DROP TRIGGER IF EXISTS trg_prevent_delete_company_account ON "CompanyAccount";
CREATE TRIGGER trg_prevent_delete_company_account
BEFORE DELETE ON "CompanyAccount"
FOR EACH ROW EXECUTE FUNCTION public.check_movements_before_delete();

DROP TRIGGER IF EXISTS trg_prevent_delete_budget ON "Budget";
CREATE TRIGGER trg_prevent_delete_budget
BEFORE DELETE ON "Budget"
FOR EACH ROW EXECUTE FUNCTION public.check_movements_before_delete();


-- 2. AUDITORÍA: Extender a todas las entidades financieras
-- Reutilizamos public.log_audit_action() definida en la migración 003

DROP TRIGGER IF EXISTS trg_audit_invoice ON "Invoice";
CREATE TRIGGER trg_audit_invoice
AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_income ON "Income";
CREATE TRIGGER trg_audit_income
AFTER INSERT OR UPDATE OR DELETE ON "Income"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget ON "Budget";
CREATE TRIGGER trg_audit_budget
AFTER INSERT OR UPDATE OR DELETE ON "Budget"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget_allocation ON "BudgetAllocation";
CREATE TRIGGER trg_audit_budget_allocation
AFTER INSERT OR UPDATE OR DELETE ON "BudgetAllocation"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget_adjustment ON "BudgetAdjustment";
CREATE TRIGGER trg_audit_budget_adjustment
AFTER INSERT OR UPDATE OR DELETE ON "BudgetAdjustment"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();


-- 3. RENDIMIENTO: Índices adicionales
CREATE INDEX IF NOT EXISTS idx_budgetadjustment_allocation ON "BudgetAdjustment"("allocationId");
CREATE INDEX IF NOT EXISTS idx_budgetadjustment_companyaccount ON "BudgetAdjustment"("companyAccountId");

-- Índice compuesto para el listado de facturas (muy común)
CREATE INDEX IF NOT EXISTS idx_invoice_composite_list 
ON "Invoice"("companyId", "status", "date" DESC);


-- 4. SEGURIDAD DE ARCHIVOS: Cloudflare R2 (Nota Importante)
-- Se mantiene el uso de Cloudflare R2 debido a su capacidad gratuita de 10GB (frente a los 50MB de Supabase).
-- La separación por carpetas ya garantiza aislamiento lógico en R2.
