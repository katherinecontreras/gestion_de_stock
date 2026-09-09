import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import { listNotificacionesHistorial, NOTIF_PAGE_SIZE, } from "@/services/notificaciones";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";
const ACCION_OPTIONS = [
    { value: "", label: "Todas las acciones" },
    { value: "Creacion", label: "Creación" },
    { value: "Eliminacion", label: "Eliminación" },
    { value: "Modificacion", label: "Modificación" },
    { value: "Asignacion_Rol", label: "Asignación de rol" },
    { value: "Asignacion_Responsable", label: "Asignación de responsable" },
    { value: "Desvinculacion_Responsable", label: "Desvinculación de responsable" },
    { value: "Invitacion", label: "Invitación" },
    { value: "Bienvenida", label: "Bienvenida" },
    { value: "Recuperacion", label: "Recuperación de contraseña / ingreso" },
    { value: "Carga_Movimiento", label: "Carga de movimientos" },
    { value: "Carga_Masiva", label: "Carga masiva" },
    { value: "Reactivacion", label: "Reactivación" },
    { value: "Inhabilitacion", label: "Inhabilitación" },
    { value: "Alerta_Recambio_EPP", label: "Alerta de recambio EPP" },
    { value: "Peticion_Depositos", label: "Pedido de depósitos" },
];
const TABLA_OPTIONS = [
    { value: "", label: "Todas las tablas" },
    { value: "responsables", label: "Responsables" },
    { value: "articulos", label: "Artículos" },
    { value: "tipos", label: "Tipos de artículos" },
    { value: "precios", label: "Precios de artículos" },
    { value: "depositos", label: "Depósitos" },
    { value: "proveedores", label: "Proveedores" },
    { value: "movimientos", label: "Movimientos" },
];
const MOVIMIENTO_OPTIONS = [
    { value: "", label: "Todos los movimientos" },
    { value: "Entrada", label: "Entrada de stock" },
    { value: "Salida", label: "Salida de stock" },
    { value: "Transferencia", label: "Transferencia de stock" },
];
const ACCION_TONE = {
    Creacion: "ok",
    Eliminacion: "error",
    Modificacion: "warning",
    Asignacion_Rol: "assign",
    Asignacion_Responsable: "assign",
    Desvinculacion_Responsable: "warning",
    Invitacion: "info",
    Bienvenida: "coupled",
    Ingreso_Plataforma: "own",
    Recuperacion_Contrasena: "rental",
    Carga_Movimiento: "trip",
    Carga_Masiva: "neutral",
    Reactivacion: "ok",
    Inhabilitacion: "warning",
    Alerta_Recambio_EPP: "warning",
    Peticion_Depositos: "assign",
};
function toneAccion(tipo) {
    if (tipo && tipo in ACCION_TONE)
        return ACCION_TONE[tipo];
    return "neutral";
}
const SELECT_CLASS = "w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus";
function FilterSelect({ label, value, onChange, options, }) {
    return (<label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[11rem]">
      <span className="text-xs font-medium text-app-secondarytext">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={SELECT_CLASS}>
        {options.map((option) => (<option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>))}
      </select>
    </label>);
}
export function NotificacionesScreen() {
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const isAdmin = Boolean(perfil?.esAdministrador);
    const canView = isAdmin || Boolean(perfil?.esVistaDescarga);
    const [searchInput, setSearchInput] = useState("");
    const [filtros, setFiltros] = useState({
        search: "",
        accion: "",
        tabla: "",
        tipoMovimiento: "",
    });
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const search = searchInput.trim();
        const timer = window.setTimeout(() => {
            if (search === filtros.search)
                return;
            setPage(0);
            setFiltros((current) => ({ ...current, search }));
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchInput, filtros.search]);
    useEffect(() => {
        if (perfilLoading)
            return;
        if (!canView) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        void listNotificacionesHistorial(filtros, page)
            .then((result) => {
            if (cancelled)
                return;
            setRows(result.rows);
            setTotal(result.total);
        })
            .catch((error) => {
            if (!cancelled) {
                notify(error.message || "No se pudo cargar el historial.", "error");
            }
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [filtros, page, canView, perfilLoading, notify]);
    if (!perfilLoading && !canView) {
        return (<div>
        <PageHeader title="Historial de notificaciones" description="El historial de auditoría está reservado al administrador y a vista y descarga."/>
      </div>);
    }
    const pageCount = Math.max(1, Math.ceil(total / NOTIF_PAGE_SIZE));
    const from = total === 0 ? 0 : page * NOTIF_PAGE_SIZE + 1;
    const to = Math.min(total, (page + 1) * NOTIF_PAGE_SIZE);
    return (<div>
      <PageHeader title="Historial de notificaciones" description="Auditoría de altas, ediciones, bajas, asignación de rol, mails y carga de movimientos."/>

      <TableShell toolbar={<div className="flex flex-col gap-3">
            <div className="relative max-w-sm">
              <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por código o texto" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <FilterSelect label="Acción" value={filtros.accion} onChange={(accion) => {
                setPage(0);
                setFiltros((current) => ({ ...current, accion }));
            }} options={ACCION_OPTIONS}/>
              <FilterSelect label="Tabla" value={filtros.tabla} onChange={(tabla) => {
                setPage(0);
                setFiltros((current) => ({ ...current, tabla }));
            }} options={TABLA_OPTIONS}/>
              <FilterSelect label="Tipo de movimiento" value={filtros.tipoMovimiento} onChange={(tipoMovimiento) => {
                setPage(0);
                setFiltros((current) => ({ ...current, tipoMovimiento }));
            }} options={MOVIMIENTO_OPTIONS}/>
            </div>
          </div>} empty={!loading && rows.length === 0
            ? "No hay notificaciones que coincidan con los filtros."
            : undefined}>
        {loading ? (<TableGhost columns={[
                { label: "Acción" },
                { label: "Fecha / hora" },
                { label: "Responsable" },
                { label: "Tabla" },
                { label: "Descripción" },
            ]}/>) : rows.length > 0 ? (<table className="w-full text-left text-sm">
            <thead className="bg-app-muted text-app-mutedtext">
              <tr>
                <th className="px-4 py-3 font-semibold">Acción</th>
                <th className="px-4 py-3 font-semibold">Fecha / hora</th>
                <th className="px-4 py-3 font-semibold">Responsable</th>
                <th className="px-4 py-3 font-semibold">Tabla</th>
                <th className="px-4 py-3 font-semibold">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (<TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-top">
                  <td className="px-4 py-3">
                    <Badge tone={toneAccion(row.tipo)} className="whitespace-nowrap">
                      {row.accion}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-app-secondarytext">
                    {formatDateTime(row.fecha)}
                  </td>
                  <td className="px-4 py-3 text-app-secondarytext">
                    {row.responsable ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-app-secondarytext">{row.tabla}</td>
                  <td className="max-w-xl px-4 py-3 leading-6 text-app-primary">
                    {row.descripcion}
                  </td>
                </TableAppearRow>))}
            </tbody>
          </table>) : null}
      </TableShell>

      {total > 0 ? (<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-app-mutedtext">
            {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={loading || page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              <ChevronLeft size={16} strokeWidth={1.7}/>
              Anterior
            </Button>
            <span className={cn("min-w-[7rem] text-center text-sm text-app-secondarytext")}>
              Página {page + 1} de {pageCount}
            </span>
            <Button variant="secondary" disabled={loading || page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>
              Siguiente
              <ChevronRight size={16} strokeWidth={1.7}/>
            </Button>
          </div>
        </div>) : null}
    </div>);
}
