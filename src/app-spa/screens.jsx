import { FileSpreadsheet, Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Button } from "@/components/ui/button";
export function ArticulosScreen() {
    return (<PagePlaceholder title="Artículos" description="Catálogo con búsqueda, filtros por familia/grupo, carga individual y masiva, y descarga a Excel." actions={<>
          <Button variant="secondary" className="w-full lg:w-auto" disabled>
            <FileSpreadsheet size={18} strokeWidth={1.6}/>
            Carga masiva
          </Button>
          <Button className="w-full lg:w-auto" disabled>
            <Plus size={18} strokeWidth={1.6}/>
            Cargar artículo
          </Button>
        </>}/>);
}
export function ArticuloHistorialScreen() {
    const { id } = useParams();
    return (<PagePlaceholder title="Historial del artículo" description={`Línea de tiempo de movimientos y costos para el artículo ${id}.`}/>);
}
export { FamiliasScreen } from "@/components/modules/familias-screen";
export { FamiliaDetalleScreen } from "@/components/modules/familia-detalle-screen";
export { ProveedoresScreen } from "@/components/modules/proveedores-screen";
export { DepositosScreen } from "@/components/modules/depositos-screen";
export function MovimientosScreen() {
    return (<PagePlaceholder title="Movimientos" description="Historial de entradas, salidas y transferencias. El responsable de depósito solo ve los de sus depósitos."/>);
}
export function MovimientoDetalleScreen() {
    const { id } = useParams();
    return (<PagePlaceholder title="Detalle de movimiento" description={`Cabecera y artículos del movimiento ${id}.`}/>);
}
export function NuevoMovimientoScreen() {
    return (<PagePlaceholder title="Nuevo movimiento" description="Asistente de 4 pasos. La persistencia se hará con rpc_crear_movimiento para garantizar atomicidad."/>);
}
export function ResponsablesScreen() {
    return (<PagePlaceholder title="Administración de responsables" description="Alta, edición, baja lógica, invitación y recuperación de contraseña. Solo rol Administrador."/>);
}
export { NotificacionesScreen } from "@/components/modules/notificaciones-screen";
