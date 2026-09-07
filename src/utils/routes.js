export const APP_SHELL = "/pages";

export const SPA_PATHS = {
  articulos: "/articulos",
  articuloHistorial: (id) => `/articulos/${id}`,
  familias: "/familias",
  familiaDetalle: (id) => `/familias/${id}`,
  proveedores: "/proveedores",
  depositos: "/depositos",
  movimientos: "/movimientos",
  movimientoNuevo: "/movimientos/nuevo",
  movimientoDetalle: (id) => `/movimientos/${id}`,
  entregas: "/entregas",
  responsables: "/responsables",
  notificaciones: "/notificaciones",
};

export const APP_ROUTES = {
  home: "/",
  login: "/autentication/login",
  registro: "/autentication/registro",
  recuperar: "/autentication/recuperar",
  articulos: SPA_PATHS.articulos,
  articuloHistorial: SPA_PATHS.articuloHistorial,
  familias: SPA_PATHS.familias,
  familiaDetalle: SPA_PATHS.familiaDetalle,
  proveedores: SPA_PATHS.proveedores,
  depositos: SPA_PATHS.depositos,
  movimientos: SPA_PATHS.movimientos,
  movimientoNuevo: SPA_PATHS.movimientoNuevo,
  movimientoDetalle: SPA_PATHS.movimientoDetalle,
  entregas: SPA_PATHS.entregas,
  responsables: SPA_PATHS.responsables,
  notificaciones: SPA_PATHS.notificaciones,
};

export function toAppEntry(path) {
  if (!path) return APP_ROUTES.articulos;

  let next = path;
  try {
    next = decodeURIComponent(path);
  } catch {
    next = path;
  }

  if (next.startsWith("/pages#")) next = next.slice("/pages#".length);
  else if (next === "/pages") next = APP_ROUTES.articulos;
  else if (next.startsWith("/pages/")) next = next.slice("/pages".length);

  if (next.startsWith("#")) next = next.slice(1);
  if (!next || next === "/") return APP_ROUTES.articulos;
  if (next.startsWith("/autentication")) return next;
  if (next.startsWith("/")) return next;
  return `/${next}`;
}
