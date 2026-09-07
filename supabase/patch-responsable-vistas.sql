-- Responsable: el listado de Artículos solo muestra lo de sus depósitos.
-- La Entrada sigue pudiendo elegir cualquier artículo activo del catálogo.
-- Pegar en el SQL Editor de Supabase (proyecto stock) y después F5 en la app.

CREATE OR REPLACE FUNCTION public.fn_responsable_id_actual()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_setting text;
BEGIN
  SELECT r.id
    INTO v_id
  FROM public.responsables r
  WHERE r.auth_user_id = auth.uid()
    AND r.estado = 'activo'
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_setting := nullif(current_setting('app.responsable_id', true), '');
  IF v_setting IS NOT NULL THEN
    RETURN v_setting::uuid;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_es_administrador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.responsables r
    JOIN public.roles rol ON rol.id = r.id_rol
    WHERE r.auth_user_id = auth.uid()
      AND r.estado = 'activo'
      AND rol.tipo = 'Administrador'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_es_vista_descarga()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.responsables r
    JOIN public.roles rol ON rol.id = r.id_rol
    WHERE r.auth_user_id = auth.uid()
      AND r.estado = 'activo'
      AND rol.tipo::text IN ('Vista_Descarga', 'Vista_Consulta')
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_es_responsable_deposito()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.responsables r
    JOIN public.roles rol ON rol.id = r.id_rol
    WHERE r.auth_user_id = auth.uid()
      AND r.estado = 'activo'
      AND rol.tipo = 'Responsable_Deposito'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_depositos_del_responsable(p_responsable uuid DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dr.id_deposito
  FROM public.depositos_responsables dr
  JOIN public.depositos d ON d.id = dr.id_deposito
  WHERE d.estado = 'activo'
    AND dr.id_responsable = COALESCE(p_responsable, public.fn_responsable_id_actual());
$$;

DROP POLICY IF EXISTS articulos_select_deposito ON public.articulos;
CREATE POLICY articulos_select_deposito ON public.articulos
  FOR SELECT TO authenticated
  USING (
    public.fn_es_administrador()
    OR public.fn_es_vista_descarga()
    OR (
      public.fn_es_responsable_deposito()
      AND estado = 'activo'
    )
    OR EXISTS (
      SELECT 1
      FROM public.inventario_depositos i
      WHERE i.id_articulo = articulos.id
        AND i.id_deposito IN (SELECT public.fn_depositos_del_responsable())
    )
  );

CREATE OR REPLACE FUNCTION public.rpc_listar_catalogo_articulos(
  p_search text DEFAULT '',
  p_solo_epp boolean DEFAULT false,
  p_from integer DEFAULT 0,
  p_to integer DEFAULT 49
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from integer;
  v_to integer;
  v_term text;
  v_total integer;
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tenés que iniciar sesión';
  END IF;

  IF NOT (
    public.fn_es_administrador()
    OR public.fn_es_responsable_deposito()
    OR public.fn_es_vista_descarga()
  ) THEN
    RAISE EXCEPTION 'No tenés permiso para ver el catálogo';
  END IF;

  v_from := GREATEST(COALESCE(p_from, 0), 0);
  v_to := GREATEST(COALESCE(p_to, v_from), v_from);
  IF (v_to - v_from) > 99 THEN
    v_to := v_from + 99;
  END IF;

  v_term := regexp_replace(trim(COALESCE(p_search, '')), '[%_,.()]', ' ', 'g');
  v_term := regexp_replace(v_term, '\s+', ' ', 'g');

  WITH base AS (
    SELECT
      a.id,
      a.codigo,
      a.nombre,
      a.unidad_de_medida,
      a.is_epp,
      g.codigo AS grupo_codigo,
      g.descripcion AS grupo_descripcion,
      f.codigo AS familia_codigo,
      f.descripcion AS familia_descripcion
    FROM public.articulos a
    LEFT JOIN public.grupos g ON g.id = a.id_grupo
    LEFT JOIN public.familias f ON f.id = g.id_familia
    WHERE a.estado = 'activo'
      AND (NOT COALESCE(p_solo_epp, false) OR a.is_epp = true)
      AND (
        v_term = ''
        OR a.codigo ILIKE '%' || v_term || '%'
        OR a.nombre ILIKE '%' || v_term || '%'
      )
  )
  SELECT
    (SELECT count(*) FROM base)::integer,
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(x))
        FROM (
          SELECT *
          FROM base
          ORDER BY codigo
          OFFSET v_from
          LIMIT (v_to - v_from + 1)
        ) x
      ),
      '[]'::jsonb
    )
  INTO v_total, v_rows;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_listar_catalogo_articulos(text, boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_listar_catalogo_articulos(text, boolean, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
