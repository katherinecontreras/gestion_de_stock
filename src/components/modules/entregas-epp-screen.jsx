import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import { explainMovimientoError, groupEntregasPorEmpleado, listEntregasEpp } from "@/services/movimientos";
import { formatDate, formatDateTime } from "@/utils/format";
import { formatDepositosMovimiento, labelTipoEntregaEpp, recambioEstado } from "@/utils/movimientos";
import { SPA_PATHS } from "@/utils/routes";
import { cn } from "@/utils/cn";

function toneRecambio(estado) {
    if (estado === "Debe recambiarse") return "warning";
    if (estado === "Ya fue recambiado") return "ok";
    return "info";
}

export function EntregasEppScreen() {
    const navigate = useNavigate();
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [openId, setOpenId] = useState(null);

    const canView = Boolean(perfil?.esAdministrador || perfil?.esVistaDescarga || perfil?.esResponsableDeposito);
    const isResponsable = Boolean(perfil?.esResponsableDeposito) && !perfil?.esAdministrador;

    useEffect(() => {
        if (perfilLoading) return;
        if (!canView) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        listEntregasEpp()
            .then((data) => {
                if (!cancelled) setRows(groupEntregasPorEmpleado(data));
            })
            .catch((error) => {
                if (!cancelled) notify(explainMovimientoError(error), "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [canView, perfilLoading, notify]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => {
            const emp = row.empleado;
            return `${emp.nombre} ${emp.apellido} ${emp.dni} ${emp.email ?? ""}`.toLowerCase().includes(term);
        });
    }, [rows, search]);

    if (perfilLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!canView) {
        return (
            <section>
                <PageHeader title="Entregas EPP" description="Historial de entregas de EPP por empleado." />
                <Alert>Tu usuario no puede ver entregas EPP.</Alert>
            </section>
        );
    }

    return (
        <section>
            <PageHeader
                title="Entregas EPP"
                description={isResponsable
                    ? "Empleados con entregas EPP en tus depósitos. Abrí la fila para ver la línea de tiempo."
                    : "Todos los empleados con entregas EPP. Abrí la fila para ver la línea de tiempo. No es el listado de Movimientos."}
            />

            <TableShell
                toolbar={(
                    <label className="relative block max-w-md">
                        <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre, apellido, DNI o mail"
                            className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                        />
                    </label>
                )}
                empty={loading
                    ? undefined
                    : filtered.length === 0
                        ? search.trim()
                            ? "No hay empleados que coincidan con la búsqueda."
                            : "Todavía no hay entregas EPP."
                        : undefined}
            >
                {loading ? (
                    <TableGhost columns={[
                        { label: "Empleado" },
                        { label: "DNI" },
                        { label: "Mail" },
                        { label: "Entregas EPP" },
                    ]} />
                ) : filtered.length > 0 ? (
                    <table className="w-full min-w-[48rem] text-left text-sm">
                        <thead className="bg-app-muted text-app-mutedtext">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Empleado</th>
                                <th className="px-4 py-3 font-semibold">DNI</th>
                                <th className="px-4 py-3 font-semibold">Mail</th>
                                <th className="px-4 py-3 text-right font-semibold">Entregas EPP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, index) => {
                                const open = openId === row.empleado.id;
                                return (
                                    <TableAppearRow key={row.empleado.id} index={index} className="border-t border-app-border-subtle align-top">
                                        <td colSpan={4} className="px-0 py-0">
                                            <button
                                                type="button"
                                                aria-expanded={open}
                                                onClick={() => setOpenId(open ? null : row.empleado.id)}
                                                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-app-subtle"
                                            >
                                                <ChevronDown
                                                    size={18}
                                                    strokeWidth={1.7}
                                                    className={cn("shrink-0 text-app-faint transition-transform", open && "rotate-180")}
                                                />
                                                <span className="min-w-0 flex-1 font-medium text-app-primary">
                                                    {row.empleado.apellido}, {row.empleado.nombre}
                                                </span>
                                                <span className="w-28 shrink-0 font-mono text-app-secondarytext">{row.empleado.dni}</span>
                                                <span className="hidden min-w-0 flex-1 truncate text-app-secondarytext lg:block">{row.empleado.email || "—"}</span>
                                                <span className="w-24 shrink-0 text-right tabular-nums text-app-secondarytext">
                                                    {row.entregas.length}
                                                </span>
                                            </button>
                                            {open ? (
                                                <ol className="relative space-y-4 border-t border-app-border-subtle bg-app-muted/40 px-4 py-4 pl-12">
                                                    {row.entregas.map((mov) => {
                                                        const alerta = recambioEstado(mov.fecha_recambio, mov.recambiado);
                                                        return (
                                                            <li key={mov.id} className="relative border-l border-app-border pl-5">
                                                                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-app-accent" />
                                                                <p className="text-xs text-app-mutedtext">{formatDateTime(mov.fecha)}</p>
                                                                <p className="text-sm font-semibold text-app-primary">
                                                                    Entrega EPP
                                                                    {mov.tipo_entrega_epp ? ` · ${labelTipoEntregaEpp(mov.tipo_entrega_epp)}` : ""}
                                                                </p>
                                                                <p className="mt-0.5 text-sm text-app-secondarytext">
                                                                    {formatDepositosMovimiento(mov.tipo, mov.origen, mov.destino)}
                                                                    {mov.nro_remito ? ` · Remito ${mov.nro_remito}` : ""}
                                                                </p>
                                                                <p className="mt-0.5 text-sm text-app-mutedtext">
                                                                    Entregó: {mov.responsable?.etiqueta ?? "—"}
                                                                    {mov.fecha_recambio ? ` · Recambio ${formatDate(mov.fecha_recambio)}` : ""}
                                                                </p>
                                                                {alerta ? (
                                                                    <div className="mt-1">
                                                                        <Badge tone={toneRecambio(alerta)}>{alerta}</Badge>
                                                                    </div>
                                                                ) : null}
                                                                <ul className="mt-2 space-y-1 text-sm text-app-secondarytext">
                                                                    {mov.articulos.map((art) => (
                                                                        <li key={art.id}>
                                                                            {art.codigo} – {art.nombre}: {art.cantidad} {art.unidad_de_medida}
                                                                            {art.observacion ? ` · ${art.observacion}` : ""}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                <Button
                                                                    variant="table"
                                                                    className="mt-2"
                                                                    onClick={() => navigate(SPA_PATHS.movimientoDetalle(mov.id))}
                                                                >
                                                                    Ver detalle
                                                                </Button>
                                                            </li>
                                                        );
                                                    })}
                                                </ol>
                                            ) : null}
                                        </td>
                                    </TableAppearRow>
                                );
                            })}
                        </tbody>
                    </table>
                ) : null}
            </TableShell>
        </section>
    );
}
