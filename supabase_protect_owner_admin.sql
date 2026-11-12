-- Protege la cuenta propietaria: rol admin fijo, sin desactivar ni borrar.
-- Ejecutar en SQL Editor de Supabase (o vía script ensure_owner_admin).

CREATE OR REPLACE FUNCTION public.protect_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email constant text := 'apoloimportlu11@gmail.com';
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF lower(OLD.email) = owner_email THEN
      RAISE EXCEPTION 'No se puede eliminar la cuenta propietaria (%)', owner_email;
    END IF;
    RETURN OLD;
  END IF;

  IF lower(OLD.email) = owner_email THEN
    IF NEW.role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'No se puede cambiar el rol de la cuenta propietaria (%)', owner_email;
    END IF;
    IF lower(NEW.email) IS DISTINCT FROM owner_email THEN
      RAISE EXCEPTION 'No se puede cambiar el email de la cuenta propietaria (%)', owner_email;
    END IF;
    IF COALESCE(NEW.is_active, true) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'No se puede desactivar la cuenta propietaria (%)', owner_email;
    END IF;

    NEW.role := 'admin';
    NEW.is_active := true;
    NEW.email := owner_email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_admin ON public.users;
CREATE TRIGGER trg_protect_owner_admin
  BEFORE UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_owner_admin();

-- Asegura que exista como admin (si ya hay fila por email)
UPDATE public.users
SET
  role = 'admin',
  is_active = true,
  email = 'apoloimportlu11@gmail.com',
  updated_at = now()
WHERE lower(email) = 'apoloimportlu11@gmail.com';
