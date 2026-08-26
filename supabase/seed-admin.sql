-- Alta del primer administrador (Katherine Contreras).
-- Ejecutar en el SQL Editor del proyecto gestion_de_stock:
-- https://supabase.com/dashboard/project/hlrerzxzrgeqwotflnxs/sql/new
--
-- Antes: Authentication → Users debe tener el usuario
-- (email típico: katherine.contreras@simetra.com).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'No hay usuarios en Auth. Creá el usuario en Authentication → Users (Auto Confirm) y volvé a correr este script.';
  END IF;
END $$;

INSERT INTO public.responsables (
  auth_user_id,
  nombre,
  apellido,
  dni,
  email,
  id_rol,
  estado,
  registrado,
  registrado_en
)
SELECT
  u.id,
  'Katherine',
  'Contreras',
  '960508223',
  u.email,
  1,
  'activo',
  true,
  now()
FROM auth.users AS u
ORDER BY
  CASE
    WHEN lower(u.email) = 'katherine.contreras@simetra.com' THEN 0
    ELSE 1
  END,
  u.created_at DESC
LIMIT 1
ON CONFLICT (dni) DO UPDATE
SET
  auth_user_id = EXCLUDED.auth_user_id,
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  id_rol = 1,
  estado = 'activo',
  registrado = true,
  registrado_en = now();

SELECT public.rpc_email_por_dni('960508223') AS email_para_login;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_email_por_dni(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
