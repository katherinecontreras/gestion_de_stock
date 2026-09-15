-- Pegá esto en el SQL Editor del proyecto gestion_de_stock (hlrerzxzrgeqwotflnxs).
-- El usuario de Auth se crea sin mail de confirmación de Supabase.
-- El mail se confirma recién cuando ingresan el código de 6 dígitos.

CREATE OR REPLACE FUNCTION public.rpc_crear_auth_registro(p_token uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_resp public.responsables%ROWTYPE;
  v_password text := COALESCE(p_password, '');
  v_email text;
  v_auth uuid;
  v_hash text;
BEGIN
  IF length(v_password) < 8
     OR v_password !~ '[A-Z]'
     OR v_password !~ '[0-9]' THEN
    RAISE EXCEPTION 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número';
  END IF;

  SELECT r.*
  INTO v_resp
  FROM public.codigos_ingreso c
  JOIN public.responsables r ON r.id = c.id_responsable
  WHERE c.token = p_token;

  IF v_resp.id IS NULL OR v_resp.registrado THEN
    RAISE EXCEPTION 'El registro no es válido. Volvé a empezar.';
  END IF;

  v_email := lower(btrim(v_resp.email));
  v_hash := crypt(v_password, gen_salt('bf'));
  v_auth := v_resp.auth_user_id;

  IF v_auth IS NULL THEN
    SELECT u.id
    INTO v_auth
    FROM auth.users u
    WHERE lower(u.email) = v_email
    LIMIT 1;
  END IF;

  IF v_auth IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.responsables r
    WHERE r.auth_user_id = v_auth
      AND r.id <> v_resp.id
      AND r.registrado = true
  ) THEN
    RAISE EXCEPTION 'Ese email ya tiene un usuario';
  END IF;

  IF v_auth IS NULL THEN
    v_auth := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_auth,
      'authenticated',
      'authenticated',
      v_email,
      v_hash,
      NULL,
      NULL,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('nombre', v_resp.nombre, 'apellido', v_resp.apellido, 'dni', v_resp.dni),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_auth,
      jsonb_build_object('sub', v_auth::text, 'email', v_email),
      'email',
      v_auth::text,
      NULL,
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_hash,
        email = v_email,
        email_confirmed_at = NULL,
        confirmation_sent_at = NULL,
        confirmation_token = '',
        updated_at = now()
    WHERE id = v_auth;
  END IF;

  UPDATE public.responsables
  SET auth_user_id = v_auth
  WHERE id = v_resp.id
    AND (auth_user_id IS NULL OR auth_user_id = v_auth);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_cambiar_email_registro(p_token uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_row public.codigos_ingreso%ROWTYPE;
  v_resp public.responsables%ROWTYPE;
  v_codigo jsonb;
BEGIN
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Ingresá un email válido';
  END IF;

  SELECT * INTO v_row FROM public.codigos_ingreso WHERE token = p_token;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'El registro no es válido. Volvé a empezar.';
  END IF;

  SELECT * INTO v_resp
  FROM public.responsables
  WHERE id = v_row.id_responsable AND registrado = false;

  IF v_resp.id IS NULL THEN
    RAISE EXCEPTION 'Este usuario ya completó el registro';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.responsables
    WHERE lower(email) = v_email AND id <> v_resp.id
  ) THEN
    RAISE EXCEPTION 'Ese email ya está en uso';
  END IF;

  UPDATE public.responsables
  SET email = v_email
  WHERE id = v_resp.id;

  IF v_resp.auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET email = v_email,
        email_confirmed_at = NULL,
        confirmation_sent_at = NULL,
        confirmation_token = '',
        updated_at = now()
    WHERE id = v_resp.auth_user_id;

    UPDATE auth.identities
    SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_email)),
        updated_at = now()
    WHERE user_id = v_resp.auth_user_id
      AND provider = 'email';
  END IF;

  v_codigo := public.fn_emitir_codigo_ingreso(v_resp.id);
  RETURN jsonb_build_object(
    'token', v_codigo ->> 'token',
    'codigo', v_codigo ->> 'codigo',
    'email', v_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_crear_auth_registro(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cambiar_email_registro(uuid, text) TO anon, authenticated;
