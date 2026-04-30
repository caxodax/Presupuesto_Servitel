-- Script: Triggers para Auditoría Automática
-- Inserta registros en AuditLog automáticamente al modificar Presupuestos o Facturas.

-- Función genérica para registrar auditoría
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
    
    IF v_userId IS NULL THEN
        -- Si no hay usuario en sesión (ej. proceso automático), no registramos o registramos como sistema
        -- Por ahora, asumimos que todas las acciones vienen de usuarios.
        v_userId := 1; -- Fallback seguro si se necesita, aunque idealmente no debería ocurrir si hay Auth.
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_entityId := NEW.id::text;
        -- Intentar extraer companyId si existe en NEW
        BEGIN
            EXECUTE 'SELECT $1."companyId"' INTO v_companyId USING NEW;
        EXCEPTION WHEN OTHERS THEN
            v_companyId := NULL;
        END;
        v_details := row_to_json(NEW)::jsonb;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_entityId := NEW.id::text;
        BEGIN
            EXECUTE 'SELECT $1."companyId"' INTO v_companyId USING NEW;
        EXCEPTION WHEN OTHERS THEN
            v_companyId := NULL;
        END;
        -- Guardamos diferencias
        v_details := jsonb_build_object(
            'old', row_to_json(OLD)::jsonb,
            'new', row_to_json(NEW)::jsonb
        );
        
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_entityId := OLD.id::text;
        BEGIN
            EXECUTE 'SELECT $1."companyId"' INTO v_companyId USING OLD;
        EXCEPTION WHEN OTHERS THEN
            v_companyId := NULL;
        END;
        v_details := row_to_json(OLD)::jsonb;
    END IF;

    -- Si no pudimos extraer el companyId de la fila (ej. tabla BudgetAllocation)
    -- Caemos en el companyId del usuario
    IF v_companyId IS NULL THEN
        v_companyId := public.get_auth_user_company_id();
    END IF;

    -- Insertamos el log (Bypass RLS momentáneo insertando como postgres o la función ya es SECURITY DEFINER)
    INSERT INTO public."AuditLog" ("companyId", "userId", "action", "entity", "entityId", "details")
    VALUES (v_companyId, v_userId, v_action, v_entity, v_entityId, v_details);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers en tablas clave
DROP TRIGGER IF EXISTS trg_audit_budget ON "Budget";
CREATE TRIGGER trg_audit_budget
AFTER INSERT OR UPDATE OR DELETE ON "Budget"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget_allocation ON "BudgetAllocation";
CREATE TRIGGER trg_audit_budget_allocation
AFTER INSERT OR UPDATE OR DELETE ON "BudgetAllocation"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_invoice ON "Invoice";
CREATE TRIGGER trg_audit_invoice
AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();

DROP TRIGGER IF EXISTS trg_audit_budget_adjustment ON "BudgetAdjustment";
CREATE TRIGGER trg_audit_budget_adjustment
AFTER INSERT OR UPDATE OR DELETE ON "BudgetAdjustment"
FOR EACH ROW EXECUTE FUNCTION public.log_audit_action();
