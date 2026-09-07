-- Permiso para buscar y dar de alta empleados en Entrega EPP.
-- Pegar en el SQL Editor del proyecto de stock y después F5 en la app.

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

NOTIFY pgrst, 'reload schema';
