import { PagePlaceholder } from "@/components/layout/page-placeholder";
export { ArticulosScreen } from "@/components/modules/articulos-screen";
export { ArticuloHistorialScreen } from "@/components/modules/articulo-historial-screen";
export { FamiliasScreen } from "@/components/modules/familias-screen";
export { FamiliaDetalleScreen } from "@/components/modules/familia-detalle-screen";
export { ProveedoresScreen } from "@/components/modules/proveedores-screen";
export { DepositosScreen } from "@/components/modules/depositos-screen";
export { MovimientosScreen } from "@/components/modules/movimientos-screen";
export { MovimientoDetalleScreen } from "@/components/modules/movimiento-detalle-screen";
export { NuevoMovimientoScreen } from "@/components/modules/nuevo-movimiento-screen";
export function ResponsablesScreen() {
    return (<PagePlaceholder title="Administración de responsables" description="Alta, edición, baja lógica, invitación y recuperación de contraseña. Solo rol Administrador."/>);
}
export { NotificacionesScreen } from "@/components/modules/notificaciones-screen";
