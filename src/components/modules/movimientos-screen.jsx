import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Eye, Plus, Search } from "lucide-react";
import { InventarioArticulosPanel, InventarioEppPanel } from "@/components/modules/inventarios-panels";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import { explainMovimientoError, listDepositosActivosOpciones, listMisDepositosOpciones, listMovimientosPagina, MOVIMIENTOS_PAGE_SIZE } from "@/services/movimientos";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { formatDepositosMovimiento, labelTipoMovimiento, toneTipoMovimiento } from "@/utils/movimientos";
import { SPA_PATHS } from "@/utils/routes";

function SortButton({ label, active, dir, align = "left", onClick }) {
    const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
    return (
        <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 font-semibold ${align === "right" ? "w-full justify-end" : ""}`}>
            {label}
            <Icon size={14} strokeWidth={1.8} className="text-app-faint" />
        </button>
    );
}

export function MovimientosScreen() {
    const navigate = useNavigate();
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [sort, setSort] = useState({ key: "fecha", dir: "desc" });
    const [vista, setVista] = useState("movimientos");
    const [depositosFiltro, setDepositosFiltro] = useState([]);

    const canView = Boolean(perfil?.esAdministrador || perfil?.esVistaDescarga || perfil?.esResponsableDeposito);
    const canWrite = Boolean(perfil?.esAdministrador || perfil?.esResponsableDeposito);

    const listFiltros = useMemo(() => ({ search, tipo: filtroTipo, sort }), [search, filtroTipo, sort]);

    useEffect(() => {
        const term = searchInput.trim();
        const timer = window.setTimeout(() => {
            if (term === search) return;
            setPage(0);
            setSearch(term);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchInput, search]);

    useEffect(() => {
        if (perfilLoading) return;
        if (!canView) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        listMovimientosPagina({ ...listFiltros, page })
            .then((result) => {
                if (cancelled) return;
                setRows(result.rows);
                setTotal(result.total);
            })
            .catch((error) => {
                if (!cancelled) notify(explainMovimientoError(error), "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [canView, perfilLoading, notify, page, listFiltros]);

    useEffect(() => {
        if (perfilLoading || !canView) return;
        let cancelled = false;
        const loader = perfil?.esResponsableDeposito && !perfil?.esAdministrador
            ? listMisDepositosOpciones()
            : listDepositosActivosOpciones();
        loader
            .then((rows) => {
                if (!cancelled) setDepositosFiltro(rows);
            })
            .catch((error) => {
                if (!cancelled) notify(explainMovimientoError(error), "error");
            });
        return () => { cancelled = true; };
    }, [canView, perfilLoading, perfil?.esResponsableDeposito, perfil?.esAdministrador, notify]);

    const pageCount = Math.max(1, Math.ceil(total / MOVIMIENTOS_PAGE_SIZE));
    const fromRow = total === 0 ? 0 : page * MOVIMIENTOS_PAGE_SIZE + 1;
    const toRow = Math.min(total, (page + 1) * MOVIMIENTOS_PAGE_SIZE);

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
                <PageHeader title="Movimientos" description="No tenés permiso para ver movimientos." />
                <Alert>Tu usuario no puede ver movimientos.</Alert>
            </section>
        );
    }

    return (
        <section>
            <PageHeader
                title="Movimientos"
                description={
                    perfil?.esResponsableDeposito
                        ? "Movimientos e inventario de tus depósitos."
                        : "Historial de movimientos e inventario por depósito."
                }
                actions={
                    canWrite ? (
                        <Button className="w-full lg:w-auto" onClick={() => navigate(SPA_PATHS.movimientoNuevo)}>
                            <Plus size={18} strokeWidth={1.6} />
                            Nuevo movimiento
                        </Button>
                    ) : null
                }
            />

            <div className="mb-4 flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-app-muted p-1">
                {[
                    { id: "movimientos", label: "Movimientos" },
                    { id: "inventario", label: "Inventario de artículos" },
                    { id: "epp", label: "Inventario EPP" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setVista(tab.id)}
                        className={cn(
                            "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-hover",
                            vista === tab.id ? "bg-app-surface text-app-primary shadow-sm" : "text-app-secondarytext hover:text-app-primary",
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {vista === "inventario" ? <InventarioArticulosPanel depositos={depositosFiltro} /> : null}
            {vista === "epp" ? <InventarioEppPanel depositos={depositosFiltro} /> : null}
            {vista === "movimientos" ? (<>
            <TableShell
                toolbar={
                    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                        <label className="relative block min-w-[12rem] flex-1">
                            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                            <input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Buscar por remito, responsable o depósito"
                                className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                            />
                        </label>
                        <SearchSelect
                            value={filtroTipo}
                            onChange={(next) => {
                                setPage(0);
                                setFiltroTipo(next);
                            }}
                            emptyOption="Todos los tipos"
                            placeholder="Buscar tipo…"
                            className="w-full lg:w-56"
                            options={[
                                { value: "Entrada", label: "Entrada" },
                                { value: "Salida", label: "Salida" },
                                { value: "Transferencia", label: "Transferencia" },
                                { value: "Entrega_EPP", label: "Entrega EPP" },
                            ]}
                        />
                        {!loading ? (
                            <p className="text-xs text-app-mutedtext lg:ml-auto">
                                {total === 0 ? "0 movimientos" : `${fromRow}–${toRow} de ${total}`}
                            </p>
                        ) : null}
                    </div>
                }
                empty={
                    loading
                        ? undefined
                        : rows.length === 0
                            ? (search || filtroTipo
                                ? "No hay movimientos que coincidan con la búsqueda o el filtro."
                                : "Todavía no hay movimientos.")
                            : undefined
                }
            >
                {loading ? (
                    <TableGhost
                        minWidth="64rem"
                        columns={[
                            { label: "Depósito" },
                            { label: "Responsable" },
                            { label: "Fecha" },
                            { label: "Movimiento" },
                            { label: "Cant. artículos", align: "right" },
                            { label: "Acciones", align: "right" },
                        ]}
                    />
                ) : rows.length > 0 ? (
                    <table className="w-full min-w-[64rem] text-left text-sm">
                        <thead className="bg-app-muted text-app-mutedtext">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Depósito</th>
                                <th className="px-4 py-3 font-semibold">Responsable</th>
                                <th className="px-4 py-3 font-semibold">
                                    <SortButton
                                        label="Fecha"
                                        active={sort.key === "fecha"}
                                        dir={sort.dir}
                                        onClick={() => {
                                            setPage(0);
                                            setSort((current) => ({
                                                key: "fecha",
                                                dir: current.key === "fecha" && current.dir === "desc" ? "asc" : "desc",
                                            }));
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 font-semibold">Movimiento</th>
                                <th className="px-4 py-3 text-right font-semibold">
                                    <SortButton
                                        label="Cant. artículos"
                                        active={sort.key === "cant"}
                                        dir={sort.dir}
                                        align="right"
                                        onClick={() => {
                                            setPage(0);
                                            setSort((current) => ({
                                                key: "cant",
                                                dir: current.key === "cant" && current.dir === "desc" ? "asc" : "desc",
                                            }));
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => (
                                <TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                                    <td className="px-4 py-3">{formatDepositosMovimiento(row.tipo, row.origen, row.destino)}</td>
                                    <td className="px-4 py-3">{row.responsable?.etiqueta || "—"}</td>
                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-app-secondarytext">
                                        {formatDateTime(row.fecha)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge tone={toneTipoMovimiento(row.tipo)}>{labelTipoMovimiento(row.tipo)}</Badge>
                                        {row.es_devolucion ? <span className="ml-2 text-xs text-app-mutedtext">Devolución</span> : null}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">{row.cant_total_articulos}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end">
                                            <Button
                                                variant="table"
                                                aria-label={`Ver detalle del movimiento ${row.nro_remito}`}
                                                onClick={() => navigate(SPA_PATHS.movimientoDetalle(row.id))}
                                            >
                                                <Eye size={18} strokeWidth={1.7} />
                                            </Button>
                                        </div>
                                    </td>
                                </TableAppearRow>
                            ))}
                        </tbody>
                    </table>
                ) : null}
            </TableShell>

            {total > 0 ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-app-mutedtext">{fromRow}–{toRow} de {total}</p>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" disabled={loading || page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                            <ChevronLeft size={16} strokeWidth={1.7} />
                            Anterior
                        </Button>
                        <span className={cn("min-w-[7rem] text-center text-sm text-app-secondarytext")}>
                            Página {page + 1} de {pageCount}
                        </span>
                        <Button variant="secondary" disabled={loading || page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>
                            Siguiente
                            <ChevronRight size={16} strokeWidth={1.7} />
                        </Button>
                    </div>
                </div>
            ) : null}
            </>) : null}
        </section>
    );
}
