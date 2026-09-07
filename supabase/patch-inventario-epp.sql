-- Inventario EPP: permiso de lectura + reconstruir desde entregas ya cargadas.
-- Pegar en el SQL Editor del proyecto de stock y después F5 en la app.

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

-- Vuelve a armar el inventario EPP con las Entrega_EPP que ya existen.
DELETE FROM public.inventario_epp_personal;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT m.id
    FROM public.movimientos m
    JOIN public.tipos_movimiento t ON t.id = m.id_tipo
    WHERE t.tipo = 'Entrega_EPP'
    ORDER BY m.fecha, m.created_at
  LOOP
    PERFORM public.fn_aplicar_inventario_epp(r.id);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
