-- Diagnóstico del esquema gestion_de_stock.
-- Pegá y ejecutá en el SQL Editor de ESTE proyecto (no en flotas).
-- Cada fila debería decir OK. Si dice FALTA, avisame cuál.

WITH esperadas AS (
  SELECT unnest(ARRAY[
    'roles',
    'responsables',
    'proveedores',
    'depositos',
    'familias',
    'grupos',
    'articulos',
    'inventario_depositos',
    'costos_articulos',
    'tipos_movimiento',
    'movimientos',
    'movimientos_articulos',
    'tipos_notificacion',
    'notificaciones',
    'notificaciones_leidas'
  ]) AS nombre
),
tablas AS (
  SELECT e.nombre,
         CASE WHEN c.relname IS NULL THEN 'FALTA' ELSE 'OK' END AS estado
  FROM esperadas e
  LEFT JOIN pg_class c
    ON c.relname = e.nombre
   AND c.relnamespace = 'public'::regnamespace
   AND c.relkind = 'r'
),
rpcs AS (
  SELECT unnest(ARRAY[
    'rpc_email_por_dni',
    'rpc_registrar_evento_auth',
    'rpc_crear_movimiento',
    'rpc_eliminar_familia',
    'rpc_eliminar_grupo'
  ]) AS nombre
),
fn AS (
  SELECT r.nombre,
         CASE WHEN p.proname IS NULL THEN 'FALTA' ELSE 'OK' END AS estado
  FROM rpcs r
  LEFT JOIN pg_proc p
    ON p.proname = r.nombre
   AND p.pronamespace = 'public'::regnamespace
),
vistas AS (
  SELECT unnest(ARRAY[
    'v_articulos_costo_actual',
    'v_familias_resumen',
    'v_grupos_resumen'
  ]) AS nombre
),
vw AS (
  SELECT v.nombre,
         CASE WHEN c.relname IS NULL THEN 'FALTA' ELSE 'OK' END AS estado
  FROM vistas v
  LEFT JOIN pg_class c
    ON c.relname = v.nombre
   AND c.relnamespace = 'public'::regnamespace
   AND c.relkind = 'v'
)
SELECT 'tabla' AS tipo, nombre, estado FROM tablas
UNION ALL
SELECT 'rpc', nombre, estado FROM fn
UNION ALL
SELECT 'vista', nombre, estado FROM vw
UNION ALL
SELECT 'seed', 'roles (3)',
       CASE WHEN to_regclass('public.roles') IS NULL THEN 'FALTA'
            WHEN (SELECT count(*) FROM public.roles) = 3 THEN 'OK'
            ELSE 'FALTA' END
UNION ALL
SELECT 'seed', 'tipos_movimiento (3)',
       CASE WHEN to_regclass('public.tipos_movimiento') IS NULL THEN 'FALTA'
            WHEN (SELECT count(*) FROM public.tipos_movimiento) = 3 THEN 'OK'
            ELSE 'FALTA' END
UNION ALL
SELECT 'seed', 'tipos_notificacion (9)',
       CASE WHEN to_regclass('public.tipos_notificacion') IS NULL THEN 'FALTA'
            WHEN (SELECT count(*) FROM public.tipos_notificacion) = 9 THEN 'OK'
            ELSE 'FALTA' END
UNION ALL
SELECT 'rls', c.relname,
       CASE WHEN c.relrowsecurity THEN 'OK' ELSE 'FALTA' END
FROM pg_class c
JOIN esperadas e ON e.nombre = c.relname
WHERE c.relnamespace = 'public'::regnamespace
UNION ALL
SELECT 'storage', 'bucket remitos',
       CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'remitos') THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'trigger', 'trg_aplicar_inventario',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
         WHERE NOT t.tgisinternal
           AND c.relname = 'movimientos_articulos'
           AND t.tgname = 'trg_aplicar_inventario'
       ) THEN 'OK' ELSE 'FALTA' END
ORDER BY 1, 2;
