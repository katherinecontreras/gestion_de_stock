-- Fecha de recambio automática: entrega + 30 días.
-- Completa las entregas ya cargadas y deja el trigger para las próximas.

CREATE OR REPLACE FUNCTION public.fn_set_fecha_recambio_epp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tipo text;
BEGIN
  SELECT tipo::text INTO v_tipo
  FROM public.tipos_movimiento
  WHERE id = NEW.id_tipo;

  IF v_tipo = 'Entrega_EPP' THEN
    NEW.fecha_recambio := COALESCE(NEW.fecha_recambio, CURRENT_DATE + 30);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fecha_recambio_epp ON public.movimientos;
CREATE TRIGGER trg_fecha_recambio_epp
  BEFORE INSERT OR UPDATE ON public.movimientos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_fecha_recambio_epp();

UPDATE public.movimientos m
SET fecha_recambio = (m.fecha::date + 30)
FROM public.tipos_movimiento t
WHERE t.id = m.id_tipo
  AND t.tipo = 'Entrega_EPP'
  AND m.fecha_recambio IS NULL;

UPDATE public.inventario_epp_personal i
SET fecha_recambio = COALESCE(m.fecha_recambio, (COALESCE(i.fecha_entrega, m.fecha)::date + 30))
FROM public.movimientos m
WHERE m.id = i.id_movimiento
  AND i.fecha_recambio IS NULL;

NOTIFY pgrst, 'reload schema';
