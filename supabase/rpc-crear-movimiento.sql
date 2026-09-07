-- Pegar entero en el SQL Editor del proyecto de stock.
-- Actualiza rpc_crear_movimiento para Entrada / Salida / Transferencia / Entrega EPP.

ALTER TYPE public.tipo_movimiento ADD VALUE IF NOT EXISTS 'Entrega_EPP';

DO $$ BEGIN
  CREATE TYPE public.tipo_entrega_epp AS ENUM (
    'Ingreso',
    'Recambio_Rotura',
    'Recambio_Talle'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.empleados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(120) NOT NULL,
  apellido    varchar(120) NOT NULL,
  dni         varchar(20) NOT NULL UNIQUE,
  email       varchar(255) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS tipo_entrega_epp public.tipo_entrega_epp,
  ADD COLUMN IF NOT EXISTS id_empleado uuid REFERENCES public.empleados (id),
  ADD COLUMN IF NOT EXISTS fecha_recambio date;

CREATE TABLE IF NOT EXISTS public.inventario_epp_personal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_deposito     uuid NOT NULL REFERENCES public.depositos (id),
  id_empleado     uuid NOT NULL REFERENCES public.empleados (id),
  id_articulo     uuid NOT NULL REFERENCES public.articulos (id),
  cantidad        integer NOT NULL CHECK (cantidad > 0),
  disponible      boolean NOT NULL DEFAULT false,
  id_movimiento   uuid REFERENCES public.movimientos (id) ON DELETE SET NULL,
  fecha_entrega   timestamptz NOT NULL DEFAULT now(),
  fecha_recambio  date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_deposito, id_empleado, id_articulo)
);

INSERT INTO public.tipos_movimiento (id, tipo, descripcion) VALUES
  (4, 'Entrega_EPP', 'Entrega de EPP a un empleado (resta stock del origen)')
ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, descripcion = EXCLUDED.descripcion;

CREATE OR REPLACE FUNCTION public.fn_aplicar_inventario_epp(p_movimiento uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov public.movimientos%ROWTYPE;
  v_tipo public.tipo_movimiento;
  v_prev uuid;
  v_linea record;
  v_en_actual boolean;
BEGIN
  SELECT * INTO STRICT v_mov FROM public.movimientos WHERE id = p_movimiento;
  SELECT tipo INTO STRICT v_tipo FROM public.tipos_movimiento WHERE id = v_mov.id_tipo;
  IF v_tipo <> 'Entrega_EPP' THEN
    RETURN;
  END IF;

  IF v_mov.fecha_recambio IS NULL THEN
    v_mov.fecha_recambio := (v_mov.fecha::date + 30);
    UPDATE public.movimientos
    SET fecha_recambio = v_mov.fecha_recambio
    WHERE id = v_mov.id;
  END IF;

  SELECT m.id
  INTO v_prev
  FROM public.movimientos m
  JOIN public.tipos_movimiento t ON t.id = m.id_tipo
  WHERE t.tipo = 'Entrega_EPP'
    AND m.id_empleado = v_mov.id_empleado
    AND m.id <> v_mov.id
    AND m.fecha <= v_mov.fecha
  ORDER BY m.fecha DESC, m.created_at DESC
  LIMIT 1;

  IF v_prev IS NOT NULL THEN
    FOR v_linea IN
      SELECT id_articulo, cantidad
      FROM public.movimientos_articulos
      WHERE id_movimiento = v_prev
    LOOP
      SELECT EXISTS (
        SELECT 1
        FROM public.movimientos_articulos actual
        WHERE actual.id_movimiento = v_mov.id
          AND actual.id_articulo = v_linea.id_articulo
      ) INTO v_en_actual;

      IF NOT v_en_actual THEN
        DELETE FROM public.inventario_epp_personal
        WHERE id_deposito = v_mov.id_deposito_destino
          AND id_empleado = v_mov.id_empleado
          AND id_articulo = v_linea.id_articulo;
      ELSE
        UPDATE public.inventario_epp_personal
        SET cantidad = cantidad - v_linea.cantidad,
            updated_at = now()
        WHERE id_deposito = v_mov.id_deposito_destino
          AND id_empleado = v_mov.id_empleado
          AND id_articulo = v_linea.id_articulo;

        DELETE FROM public.inventario_epp_personal
        WHERE id_deposito = v_mov.id_deposito_destino
          AND id_empleado = v_mov.id_empleado
          AND id_articulo = v_linea.id_articulo
          AND cantidad <= 0;
      END IF;
    END LOOP;
  END IF;

  FOR v_linea IN
    SELECT id_articulo, cantidad
    FROM public.movimientos_articulos
    WHERE id_movimiento = v_mov.id
  LOOP
    INSERT INTO public.inventario_epp_personal (
      id_deposito, id_empleado, id_articulo, cantidad, disponible,
      id_movimiento, fecha_entrega, fecha_recambio
    ) VALUES (
      v_mov.id_deposito_destino,
      v_mov.id_empleado,
      v_linea.id_articulo,
      v_linea.cantidad,
      false,
      v_mov.id,
      v_mov.fecha,
      v_mov.fecha_recambio
    )
    ON CONFLICT (id_deposito, id_empleado, id_articulo)
    DO UPDATE SET
      cantidad = public.inventario_epp_personal.cantidad + EXCLUDED.cantidad,
      id_movimiento = EXCLUDED.id_movimiento,
      fecha_entrega = EXCLUDED.fecha_entrega,
      fecha_recambio = EXCLUDED.fecha_recambio,
      updated_at = now();
  END LOOP;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'rpc_crear_movimiento'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rpc_crear_movimiento(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movimiento_id uuid;
  v_item jsonb;
  v_responsable uuid;
  v_tipo public.tipo_movimiento;
  v_entrega public.tipo_entrega_epp;
  v_articulos jsonb;
  v_fotos text[];
  v_id_tipo smallint;
  v_origen uuid;
  v_destino uuid;
  v_proveedor uuid;
  v_empleado uuid;
BEGIN
  v_articulos := p_payload -> 'articulos';
  IF v_articulos IS NULL OR jsonb_typeof(v_articulos) <> 'array' OR jsonb_array_length(v_articulos) = 0 THEN
    RAISE EXCEPTION 'El movimiento debe incluir al menos un artículo';
  END IF;

  IF btrim(COALESCE(p_payload ->> 'nro_remito', '')) = '' THEN
    RAISE EXCEPTION 'El número de remito es obligatorio';
  END IF;

  SELECT COALESCE(array_agg(elem), ARRAY[]::text[])
  INTO v_fotos
  FROM jsonb_array_elements_text(COALESCE(p_payload -> 'fotos_remito', '[]'::jsonb)) AS elem;

  IF cardinality(v_fotos) = 0 THEN
    RAISE EXCEPTION 'Hay que adjuntar al menos una foto del remito';
  END IF;

  v_id_tipo := (p_payload ->> 'id_tipo')::smallint;
  v_origen := nullif(p_payload ->> 'id_deposito_origen', '')::uuid;
  v_destino := nullif(p_payload ->> 'id_deposito_destino', '')::uuid;
  v_proveedor := nullif(p_payload ->> 'id_proveedor', '')::uuid;
  v_empleado := nullif(p_payload ->> 'id_empleado', '')::uuid;

  SELECT tipo INTO v_tipo FROM public.tipos_movimiento WHERE id = v_id_tipo;
  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  IF v_tipo = 'Entrega_EPP' THEN
    IF btrim(COALESCE(p_payload ->> 'tipo_entrega_epp', '')) = '' THEN
      RAISE EXCEPTION 'Una entrega EPP requiere el tipo de entrega';
    END IF;
    v_entrega := (p_payload ->> 'tipo_entrega_epp')::public.tipo_entrega_epp;
  ELSE
    v_entrega := NULL;
  END IF;

  v_responsable := public.fn_responsable_id_actual();
  IF v_responsable IS NULL THEN
    RAISE EXCEPTION 'No hay un responsable autenticado para cargar el movimiento';
  END IF;

  IF NOT public.fn_es_administrador() THEN
    IF v_tipo = 'Entrada' AND v_destino NOT IN (SELECT public.fn_depositos_del_responsable()) THEN
      RAISE EXCEPTION 'Solo podés cargar entradas en tus depósitos';
    END IF;
    IF v_tipo IN ('Salida', 'Transferencia', 'Entrega_EPP')
       AND v_origen NOT IN (SELECT public.fn_depositos_del_responsable()) THEN
      RAISE EXCEPTION 'Solo podés sacar o transferir desde tus depósitos';
    END IF;
  END IF;

  INSERT INTO public.movimientos (
    id_tipo,
    id_responsable,
    id_deposito_origen,
    id_deposito_destino,
    id_proveedor,
    es_devolucion,
    motivo,
    nro_remito,
    fotos_remito,
    tipo_entrega_epp,
    id_empleado,
    fecha_recambio
  ) VALUES (
    v_id_tipo,
    v_responsable,
    v_origen,
    v_destino,
    v_proveedor,
    COALESCE((p_payload ->> 'es_devolucion')::boolean, false),
    nullif(btrim(COALESCE(p_payload ->> 'motivo', '')), ''),
    btrim(p_payload ->> 'nro_remito'),
    v_fotos,
    v_entrega,
    v_empleado,
    CASE WHEN v_tipo = 'Entrega_EPP' THEN CURRENT_DATE + 30 ELSE NULL END
  )
  RETURNING id INTO v_movimiento_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_articulos)
  LOOP
    INSERT INTO public.movimientos_articulos (
      id_movimiento,
      id_articulo,
      cantidad,
      observacion
    ) VALUES (
      v_movimiento_id,
      (v_item ->> 'id_articulo')::uuid,
      (v_item ->> 'cantidad')::integer,
      nullif(v_item ->> 'observacion', '')
    );
  END LOOP;

  PERFORM public.fn_aplicar_inventario_epp(v_movimiento_id);

  RETURN v_movimiento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_crear_movimiento(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_aplicar_inventario_epp(uuid) TO authenticated;

ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.empleados TO authenticated;

DROP POLICY IF EXISTS empleados_select ON public.empleados;
CREATE POLICY empleados_select ON public.empleados
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS empleados_insert_operadores ON public.empleados;
CREATE POLICY empleados_insert_operadores ON public.empleados
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_es_administrador() OR public.fn_es_responsable_deposito());

ALTER TABLE public.inventario_epp_personal ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.inventario_epp_personal TO authenticated;

DROP POLICY IF EXISTS inventario_epp_select ON public.inventario_epp_personal;
CREATE POLICY inventario_epp_select ON public.inventario_epp_personal
  FOR SELECT TO authenticated
  USING (
    public.fn_es_administrador()
    OR public.fn_es_vista_descarga()
    OR id_deposito IN (SELECT public.fn_depositos_del_responsable())
    OR EXISTS (
      SELECT 1
      FROM public.movimientos m
      WHERE m.id = inventario_epp_personal.id_movimiento
        AND (
          m.id_deposito_origen IN (SELECT public.fn_depositos_del_responsable())
          OR m.id_deposito_destino IN (SELECT public.fn_depositos_del_responsable())
        )
    )
  );

NOTIFY pgrst, 'reload schema';
