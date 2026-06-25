-- Migración 018: Sincronización de Custom JWT Claims
-- Este trigger asegura que el role, companyId y branchId del usuario
-- se guarden automáticamente en el token de sesión (JWT) de Supabase
-- para evitar consultas recurrentes a la base de datos.

CREATE OR REPLACE FUNCTION public.sync_user_claims()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role,
      'companyId', NEW."companyId",
      'branchId', NEW."branchId",
      'profileId', NEW.id,
      'name', NEW.name
    )
  WHERE id = NEW."authId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos el trigger si ya existía para evitar duplicados
DROP TRIGGER IF EXISTS on_user_profile_updated ON public."User";

-- Creamos el trigger para que se ejecute al insertar o modificar un usuario
CREATE TRIGGER on_user_profile_updated
  AFTER INSERT OR UPDATE OF role, "companyId", "branchId", "authId" ON public."User"
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_claims();

-- Script de inicialización: 
-- Sincronizamos los usuarios existentes manualmente por única vez
DO $$
DECLARE
  usr RECORD;
BEGIN
  FOR usr IN SELECT id, "authId", name, role, "companyId", "branchId" FROM public."User" WHERE "authId" IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'role', usr.role,
        'companyId', usr."companyId",
        'branchId', usr."branchId",
        'profileId', usr.id,
        'name', usr.name
      )
    WHERE id = usr."authId";
  END LOOP;
END;
$$;
