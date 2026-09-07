-- Patch incremental movimientos / Entrega EPP / empleados
-- Pegar en el SQL Editor del proyecto de stock.

ALTER TYPE public.tipo_notificacion ADD VALUE IF NOT EXISTS 'Alerta_Recambio_EPP';
ALTER TYPE public.tipo_movimiento ADD VALUE IF NOT EXISTS 'Entrega_EPP';

DO $$ BEGIN
  CREATE TYPE public.tipo_entrega_epp AS ENUM (
    'Ingreso',
    'Recambio_Rotura',
    'Recambio_Talle'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------


CREATE TABLE IF NOT EXISTS public.empleados (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      varchar(120) NOT NULL,
  apellido    varchar(120) NOT NULL,
  dni         varchar(20) NOT NULL UNIQUE,
  email       varchar(255) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


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

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS tipo_entrega_epp public.tipo_entrega_epp,
  ADD COLUMN IF NOT EXISTS id_empleado uuid REFERENCES public.empleados (id),
  ADD COLUMN IF NOT EXISTS fecha_recambio date;


CREATE INDEX IF NOT EXISTS idx_empleados_dni ON public.empleados (dni);
CREATE INDEX IF NOT EXISTS idx_empleados_nombre ON public.empleados (lower(nombre), lower(apellido));
CREATE INDEX IF NOT EXISTS idx_movimientos_empleado ON public.movimientos (id_empleado);
CREATE INDEX IF NOT EXISTS idx_inventario_epp_deposito ON public.inventario_epp_personal (id_deposito);
CREATE INDEX IF NOT EXISTS idx_inventario_epp_empleado ON public.inventario_epp_personal (id_empleado);


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


CREATE OR REPLACE FUNCTION public.fn_validar_movimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo public.tipo_movimiento;
BEGIN
  SELECT tipo INTO v_tipo FROM public.tipos_movimiento WHERE id = NEW.id_tipo;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  IF v_tipo = 'Entrada' THEN
    IF NEW.id_deposito_destino IS NULL THEN
      RAISE EXCEPTION 'Una entrada requiere depósito destino';
    END IF;
    NEW.id_deposito_origen := NULL;
    NEW.tipo_entrega_epp := NULL;
    NEW.id_empleado := NULL;
    NEW.fecha_recambio := NULL;
  ELSIF v_tipo = 'Salida' THEN
    IF NEW.id_deposito_origen IS NULL THEN
      RAISE EXCEPTION 'Una salida requiere depósito origen';
    END IF;
    IF NEW.es_devolucion AND NEW.id_proveedor IS NULL THEN
      RAISE EXCEPTION 'Una devolución requiere proveedor';
    END IF;
    NEW.tipo_entrega_epp := NULL;
    NEW.id_empleado := NULL;
    NEW.fecha_recambio := NULL;
  ELSIF v_tipo = 'Transferencia' THEN
    IF NEW.id_deposito_origen IS NULL OR NEW.id_deposito_destino IS NULL THEN
      RAISE EXCEPTION 'Una transferencia requiere depósito origen y destino';
    END IF;
    NEW.es_devolucion := false;
    NEW.id_proveedor := NULL;
    NEW.tipo_entrega_epp := NULL;
    NEW.id_empleado := NULL;
    NEW.fecha_recambio := NULL;
  ELSIF v_tipo = 'Entrega_EPP' THEN
    IF NEW.id_deposito_origen IS NULL OR NEW.id_deposito_destino IS NULL THEN
      RAISE EXCEPTION 'Una entrega EPP requiere depósito origen y destino';
    END IF;
    IF NEW.id_deposito_origen = NEW.id_deposito_destino THEN
      RAISE EXCEPTION 'El depósito origen y destino deben ser distintos';
    END IF;
    IF NEW.tipo_entrega_epp IS NULL THEN
      RAISE EXCEPTION 'Una entrega EPP requiere el tipo de entrega';
    END IF;
    IF NEW.id_empleado IS NULL THEN
      RAISE EXCEPTION 'Una entrega EPP requiere un empleado';
    END IF;
    IF NEW.fotos_remito IS NULL OR cardinality(NEW.fotos_remito) = 0 THEN
      RAISE EXCEPTION 'Una entrega EPP requiere al menos una foto de remito';
    END IF;
    NEW.es_devolucion := false;
    NEW.id_proveedor := NULL;
    NEW.fecha_recambio := COALESCE(NEW.fecha_recambio, (CURRENT_DATE + 30));
  END IF;

  IF NEW.id_responsable IS NULL THEN
    NEW.id_responsable := public.fn_responsable_id_actual();
  END IF;

  IF NEW.id_responsable IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar el responsable del movimiento';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_aplicar_movimiento_articulo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov public.movimientos%ROWTYPE;
  v_tipo public.tipo_movimiento;
BEGIN
  SELECT * INTO STRICT v_mov FROM public.movimientos WHERE id = NEW.id_movimiento;
  SELECT tipo INTO STRICT v_tipo FROM public.tipos_movimiento WHERE id = v_mov.id_tipo;

  UPDATE public.movimientos
  SET cant_total_articulos = cant_total_articulos + NEW.cantidad
  WHERE id = NEW.id_movimiento;

  IF v_tipo = 'Entrega_EPP' AND COALESCE((SELECT is_epp FROM public.articulos WHERE id = NEW.id_articulo), false) = false THEN
    RAISE EXCEPTION 'En una entrega EPP todos los artículos deben ser EPP';
  END IF;

  IF v_tipo = 'Entrada' THEN
    PERFORM public.fn_ajustar_inventario(v_mov.id_deposito_destino, NEW.id_articulo, NEW.cantidad);

  ELSIF v_tipo = 'Salida' THEN
    PERFORM public.fn_ajustar_inventario(v_mov.id_deposito_origen, NEW.id_articulo, -NEW.cantidad);

  ELSIF v_tipo = 'Transferencia' THEN
    PERFORM public.fn_ajustar_inventario(v_mov.id_deposito_origen, NEW.id_articulo, -NEW.cantidad);
    PERFORM public.fn_ajustar_inventario(v_mov.id_deposito_destino, NEW.id_articulo, NEW.cantidad);

  ELSIF v_tipo = 'Entrega_EPP' THEN
    PERFORM public.fn_ajustar_inventario(v_mov.id_deposito_origen, NEW.id_articulo, -NEW.cantidad);
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_nombre_empleado(p_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(btrim(concat_ws(' ', e.nombre, e.apellido)), '')
  FROM public.empleados e
  WHERE e.id = p_id
$$;


CREATE OR REPLACE FUNCTION public.fn_trg_notificar_movimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov public.movimientos%ROWTYPE;
  v_tipo text;
  v_origen text;
  v_destino text;
  v_depositos text;
BEGIN
  -- Relee el movimiento: el trigger es diferido y ya incluye el detalle.
  SELECT * INTO STRICT v_mov FROM public.movimientos WHERE id = NEW.id;
  SELECT tipo::text INTO v_tipo FROM public.tipos_movimiento WHERE id = v_mov.id_tipo;
  SELECT nombre INTO v_origen FROM public.depositos WHERE id = v_mov.id_deposito_origen;
  SELECT nombre INTO v_destino FROM public.depositos WHERE id = v_mov.id_deposito_destino;

  IF v_tipo = 'Entrada' THEN
    v_depositos := COALESCE(v_destino, 'depósito destino');
  ELSE
    v_depositos := format('%s / %s', COALESCE(v_origen, '-'), COALESCE(v_destino, '-'));
  END IF;

  PERFORM public.fn_insertar_notificacion(
    'Carga_Movimiento',
    format(
      'Movimiento %s (%s). Remito %s. Depósitos: %s. Cantidad total: %s. Motivo: %s%s',
      v_tipo,
      v_mov.fecha,
      v_mov.nro_remito,
      v_depositos,
      v_mov.cant_total_articulos,
      COALESCE(v_mov.motivo, '-'),
      CASE
        WHEN v_mov.id_empleado IS NOT NULL THEN
          format(' · Empleado: %s', COALESCE(public.fn_nombre_empleado(v_mov.id_empleado), v_mov.id_empleado::text))
        ELSE ''
      END
    ),
    'movimientos',
    v_mov.id,
    v_mov.id_responsable,
    NULL,
    jsonb_build_object(
      'tipo', v_tipo,
      'id_deposito_origen', v_mov.id_deposito_origen,
      'id_deposito_destino', v_mov.id_deposito_destino,
      'id_proveedor', v_mov.id_proveedor,
      'es_devolucion', v_mov.es_devolucion,
      'id_empleado', v_mov.id_empleado
    )
  );

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_notif_empleados ON public.empleados;
CREATE TRIGGER trg_notif_empleados
  AFTER INSERT OR UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.fn_trg_notificar_maestro();


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

-- Alta transaccional de un movimiento + detalle (atomicidad de N artículos).
DROP FUNCTION IF EXISTS public.rpc_crear_movimiento(smallint, uuid, uuid, uuid, boolean, text, text, text[], jsonb);

CREATE OR REPLACE FUNCTION public.rpc_crear_movimiento(
  p_id_tipo smallint,
  p_id_deposito_origen uuid,
  p_id_deposito_destino uuid,
  p_id_proveedor uuid,
  p_es_devolucion boolean,
  p_motivo text,
  p_nro_remito text,
  p_fotos_remito text[],
  p_articulos jsonb,
  p_tipo_entrega_epp text DEFAULT NULL,
  p_id_empleado uuid DEFAULT NULL
)
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
BEGIN
  IF p_articulos IS NULL OR jsonb_typeof(p_articulos) <> 'array' OR jsonb_array_length(p_articulos) = 0 THEN
    RAISE EXCEPTION 'El movimiento debe incluir al menos un artículo';
  END IF;

  IF btrim(COALESCE(p_nro_remito, '')) = '' THEN
    RAISE EXCEPTION 'El número de remito es obligatorio';
  END IF;

  IF p_fotos_remito IS NULL OR cardinality(p_fotos_remito) = 0 THEN
    RAISE EXCEPTION 'Hay que adjuntar al menos una foto del remito';
  END IF;

  SELECT tipo INTO v_tipo FROM public.tipos_movimiento WHERE id = p_id_tipo;
  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  IF v_tipo = 'Entrega_EPP' THEN
    IF p_tipo_entrega_epp IS NULL OR btrim(p_tipo_entrega_epp) = '' THEN
      RAISE EXCEPTION 'Una entrega EPP requiere el tipo de entrega';
    END IF;
    v_entrega := p_tipo_entrega_epp::public.tipo_entrega_epp;
  ELSE
    v_entrega := NULL;
  END IF;

  v_responsable := public.fn_responsable_id_actual();
  IF v_responsable IS NULL THEN
    RAISE EXCEPTION 'No hay un responsable autenticado para cargar el movimiento';
  END IF;

  IF NOT public.fn_es_administrador() THEN
    IF v_tipo = 'Entrada' AND p_id_deposito_destino NOT IN (SELECT public.fn_depositos_del_responsable()) THEN
      RAISE EXCEPTION 'Solo podés cargar entradas en tus depósitos';
    END IF;
    IF v_tipo IN ('Salida', 'Transferencia', 'Entrega_EPP')
       AND p_id_deposito_origen NOT IN (SELECT public.fn_depositos_del_responsable()) THEN
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
    id_empleado
  ) VALUES (
    p_id_tipo,
    v_responsable,
    p_id_deposito_origen,
    p_id_deposito_destino,
    p_id_proveedor,
    COALESCE(p_es_devolucion, false),
    p_motivo,
    btrim(p_nro_remito),
    COALESCE(p_fotos_remito, ARRAY[]::text[]),
    v_entrega,
    p_id_empleado
  )
  RETURNING id INTO v_movimiento_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_articulos)
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

GRANT EXECUTE ON FUNCTION public.rpc_crear_movimiento(
  smallint, uuid, uuid, uuid, boolean, text, text, text[], jsonb, text, uuid
) TO authenticated;

INSERT INTO public.tipos_movimiento (id, tipo, descripcion) VALUES
  (4, 'Entrega_EPP', 'Entrega de EPP a un empleado (resta stock del origen)')
ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, descripcion = EXCLUDED.descripcion;

INSERT INTO public.tipos_notificacion (id, tipo, descripcion) VALUES
  (15, 'Alerta_Recambio_EPP', 'Hay que recambiar EPP de un empleado')
ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo, descripcion = EXCLUDED.descripcion;

SELECT setval(pg_get_serial_sequence('public.tipos_movimiento', 'id'), (SELECT MAX(id) FROM public.tipos_movimiento));
SELECT setval(pg_get_serial_sequence('public.tipos_notificacion', 'id'), (SELECT MAX(id) FROM public.tipos_notificacion));

ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario_epp_personal ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empleados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_epp_personal TO authenticated;

DROP POLICY IF EXISTS empleados_select ON public.empleados;
CREATE POLICY empleados_select ON public.empleados
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS empleados_insert_operadores ON public.empleados;
CREATE POLICY empleados_insert_operadores ON public.empleados
  FOR INSERT TO authenticated
  WITH CHECK (public.fn_es_administrador() OR public.fn_es_responsable_deposito());

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

DROP POLICY IF EXISTS propio_deposito_select ON public.depositos;
CREATE POLICY propio_deposito_select ON public.depositos
  FOR SELECT TO authenticated
  USING (
    public.fn_es_administrador()
    OR public.fn_es_vista_descarga()
    OR id IN (SELECT public.fn_depositos_del_responsable())
    OR estado = 'activo'
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('remitos', 'remitos', false)
ON CONFLICT (id) DO NOTHING;
