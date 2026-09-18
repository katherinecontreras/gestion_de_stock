-- Pegá esto en el SQL Editor del proyecto gestion_de_stock (hlrerzxzrgeqwotflnxs).
-- Crea rpc_eliminar_articulo y bloquea movimientos de artículos inactivos.

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

  IF COALESCE((SELECT estado FROM public.articulos WHERE id = NEW.id_articulo), 'inactivo') <> 'activo' THEN
    RAISE EXCEPTION 'El artículo está inactivo. No se pueden hacer más movimientos con él.';
  END IF;

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

CREATE OR REPLACE FUNCTION public.rpc_eliminar_articulo(p_articulo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text;
  v_nombre text;
BEGIN
  IF NOT public.fn_es_administrador() THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar artículos';
  END IF;

  SELECT a.codigo, a.nombre
  INTO v_codigo, v_nombre
  FROM public.articulos a
  WHERE a.id = p_articulo;

  IF v_codigo IS NULL THEN
    RAISE EXCEPTION 'El artículo no existe';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.movimientos_articulos ma
    WHERE ma.id_articulo = p_articulo
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar: hay movimientos en el historial. Desactivalo para que no se puedan hacer más movimientos con él.';
  END IF;

  PERFORM set_config('app.carga_masiva', '1', true);

  DELETE FROM public.inventario_depositos WHERE id_articulo = p_articulo;
  DELETE FROM public.costos_articulos WHERE id_articulo = p_articulo;
  DELETE FROM public.articulos WHERE id = p_articulo;

  PERFORM public.fn_insertar_notificacion(
    'Eliminacion',
    format('Se eliminó el artículo %s – %s.', v_codigo, v_nombre),
    'articulos',
    p_articulo,
    public.fn_responsable_id_actual(),
    NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_eliminar_articulo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_eliminar_articulo(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
