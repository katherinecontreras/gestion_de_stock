import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, InternalCode } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableShell } from "@/components/ui/table";
import { useToast } from "@/app/layouts/ToastProvider";
import {
    explainArticuloError,
    getArticulo,
    listCostosArticulo,
    listMovimientosArticulo,
    listStockArticuloPorDepositos,
} from "@/services/articulos";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDate, formatDateTime, formatFamiliaGrupo } from "@/utils/format";
import { SPA_PATHS } from "@/utils/routes";

function embedOne(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

const TIPO_ENTREGA_EPP = {
    Ingreso: "Ingreso",
    Recambio_Rotura: "Recambio por rotura",
    Recambio_Talle: "Recambio por talle",
};

const VISTAS = [
    { id: "movimientos", label: "Historial de movimientos" },
    { id: "depositos", label: "Historial de depósitos" },
    { id: "costos", label: "Historial de costos" },
];

function recambioEstado(mov, recambiado) {
    if (recambiado) return "Ya fue recambiado";
    if (!mov?.fecha_recambio) return null;
    const due = new Date(mov.fecha_recambio);
    if (Number.isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due > today) return "Recambio pendiente";
    return "Debe recambiarse";
}

function depositoDe(row) {
    if (!row) return null;
    return {
        id: row.id,
        codigo: row.codigo ?? "",
        nombre: row.nombre ?? "",
        ubicacion: row.ubicacion ?? "",
    };
}

function depositosDelMovimiento(item) {
    const mov = embedOne(item.movimientos);
    return {
        mov,
        tipo: embedOne(mov?.tipos_movimiento)?.tipo ?? "Movimiento",
        origen: depositoDe(embedOne(mov?.deposito_origen)),
        destino: depositoDe(embedOne(mov?.deposito_destino)),
        empleado: embedOne(mov?.empleado),
    };
}

function etiquetaDepositos(tipo, origen, destino) {
    if (tipo === "Entrada") return destino ? `${destino.codigo} – ${destino.nombre}` : "—";
    return [origen, destino].filter(Boolean).map((dep) => `${dep.codigo} – ${dep.nombre}`).join(" / ") || "—";
}

function MovimientoTimeline({ items, unidad, recambioLookup }) {
    if (items.length === 0) {
        return <p className="text-sm text-app-mutedtext">Todavía no hay movimientos de este artículo.</p>;
    }
    return (
        <ol className="relative space-y-4 border-l border-app-border pl-5">
            {items.map((item) => {
                const { mov, tipo, origen, destino, empleado } = depositosDelMovimiento(item);
                const recambiado = Boolean(recambioLookup?.get(item.id));
                const alerta = tipo === "Entrega_EPP" ? recambioEstado(mov, recambiado) : null;
                const tipoEntrega = mov?.tipo_entrega_epp
                    ? (TIPO_ENTREGA_EPP[mov.tipo_entrega_epp] ?? String(mov.tipo_entrega_epp).replaceAll("_", " "))
                    : null;
                return (
                    <li key={item.id} className="relative">
                        <span className="absolute -left-[1.45rem] top-1.5 h-2.5 w-2.5 rounded-full bg-app-accent" />
                        <p className="text-xs text-app-mutedtext">{formatDateTime(mov?.fecha ?? item.created_at)}</p>
                        <p className="text-sm font-semibold text-app-primary">{tipo.replaceAll("_", " ")}</p>
                        <p className="mt-0.5 text-sm text-app-secondarytext">
                            {etiquetaDepositos(tipo, origen, destino)} · {item.cantidad} {unidad}
                            {mov?.nro_remito ? ` · Remito ${mov.nro_remito}` : ""}
                            {tipoEntrega ? ` · ${tipoEntrega}` : ""}
                        </p>
                        {empleado ? (
                            <p className="mt-0.5 text-sm text-app-mutedtext">
                                Empleado: {empleado.nombre} {empleado.apellido} ({empleado.dni})
                            </p>
                        ) : null}
                        {mov?.fecha_recambio ? (
                            <p className="mt-0.5 text-sm text-app-mutedtext">
                                Recambio: {formatDate(mov.fecha_recambio)}
                            </p>
                        ) : null}
                        {item.observacion ? (
                            <p className="mt-0.5 text-sm text-app-mutedtext">{item.observacion}</p>
                        ) : null}
                        {alerta ? (
                            <div className="mt-1">
                                <Badge tone={alerta === "Debe recambiarse" ? "warning" : alerta === "Ya fue recambiado" ? "ok" : "info"}>
                                    {alerta}
                                </Badge>
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ol>
    );
}

export function ArticuloHistorialScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notify } = useToast();
    const [articulo, setArticulo] = useState(null);
    const [vista, setVista] = useState("movimientos");
    const [movimientos, setMovimientos] = useState([]);
    const [costos, setCostos] = useState([]);
    const [stock, setStock] = useState([]);
    const [abierto, setAbierto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            getArticulo(id),
            listMovimientosArticulo(id),
            listCostosArticulo(id),
            listStockArticuloPorDepositos(id),
        ])
            .then(([art, movs, costs, deps]) => {
                if (cancelled) return;
                setArticulo(art);
                setMovimientos(movs);
                setCostos(costs);
                setStock(deps);
                setError(art ? null : "No se encontró el artículo.");
            })
            .catch((err) => {
                if (!cancelled) {
                    const text = explainArticuloError(err);
                    setError(text);
                    notify(text, "error");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [id, notify]);

    const recambioLookup = useMemo(() => {
        const lookup = new Map();
        movimientos.forEach((item, index) => {
            const { tipo, empleado } = depositosDelMovimiento(item);
            if (tipo !== "Entrega_EPP" || !empleado?.dni) return;
            const later = movimientos.slice(0, index).some((other) => {
                const extra = depositosDelMovimiento(other);
                return extra.tipo === "Entrega_EPP" && extra.empleado?.dni === empleado.dni;
            });
            lookup.set(item.id, later);
        });
        return lookup;
    }, [movimientos]);

    const historialDepositos = useMemo(() => {
        const map = new Map();
        for (const row of stock) {
            map.set(row.id, {
                ...row,
                movimientos: [],
            });
        }
        for (const item of movimientos) {
            const { origen, destino } = depositosDelMovimiento(item);
            for (const dep of [origen, destino]) {
                if (!dep?.id) continue;
                if (!map.has(dep.id)) {
                    map.set(dep.id, {
                        id: dep.id,
                        codigo: dep.codigo,
                        nombre: dep.nombre,
                        ubicacion: dep.ubicacion ?? "",
                        cantidad_actual: 0,
                        movimientos: [],
                    });
                }
                map.get(dep.id).movimientos.push(item);
            }
        }
        return [...map.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    }, [stock, movimientos]);

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    const unidad = articulo?.unidad_de_medida ?? "u.";

    return (
        <section>
            <PageHeader
                title={articulo ? `${articulo.codigo} – ${articulo.nombre}` : "Historial del artículo"}
                description={
                    articulo
                        ? [
                            articulo.familia_codigo ? formatFamiliaGrupo(articulo.familia_codigo, articulo.familia_descripcion) : null,
                            articulo.grupo_codigo ? formatFamiliaGrupo(articulo.grupo_codigo, articulo.grupo_descripcion) : null,
                            articulo.unidad_de_medida,
                            articulo.is_epp ? "EPP" : null,
                        ].filter(Boolean).join(" · ")
                        : "Línea de tiempo de movimientos, depósitos y costos."
                }
                actions={
                    <Button variant="secondary" onClick={() => navigate(SPA_PATHS.articulos)}>
                        <ArrowLeft size={18} strokeWidth={1.6} />
                        Volver
                    </Button>
                }
            />

            <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-app-muted p-1">
                {VISTAS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setVista(tab.id)}
                        className={cn(
                            "rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-hover",
                            vista === tab.id ? "bg-app-surface text-app-primary shadow-sm" : "text-app-secondarytext hover:text-app-primary",
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {error ? <Alert>{error}</Alert> : null}

            {vista === "costos" ? (
                costos.length === 0 ? (
                    <p className="text-sm text-app-mutedtext">Este artículo todavía no tiene costos cargados.</p>
                ) : (
                    <ol className="relative space-y-4 border-l border-app-border pl-5">
                        {costos.map((item) => (
                            <li key={item.id} className="relative">
                                <span className="absolute -left-[1.45rem] top-1.5 h-2.5 w-2.5 rounded-full bg-app-accent" />
                                <p className="text-xs text-app-mutedtext">{formatDateTime(item.fecha)}</p>
                                <p className="text-sm font-semibold text-app-primary">{formatCurrency(item.costo)}</p>
                            </li>
                        ))}
                    </ol>
                )
            ) : null}

            {vista === "movimientos" ? (
                <MovimientoTimeline items={movimientos} unidad={unidad} recambioLookup={recambioLookup} />
            ) : null}

            {vista === "depositos" ? (
                historialDepositos.length === 0 ? (
                    <p className="text-sm text-app-mutedtext">Este artículo todavía no tiene historial en ningún depósito.</p>
                ) : (
                    <TableShell>
                        <table className="w-full min-w-[48rem] text-left text-sm">
                            <thead className="bg-app-muted text-app-mutedtext">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Código</th>
                                    <th className="px-4 py-3 font-semibold">Depósito</th>
                                    <th className="px-4 py-3 font-semibold">Ubicación</th>
                                    <th className="px-4 py-3 text-right font-semibold">Stock actual</th>
                                    <th className="px-4 py-3 text-right font-semibold">Costo</th>
                                    <th className="w-12 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {historialDepositos.map((dep, index) => {
                                    const open = abierto === dep.id;
                                    const costo = articulo?.costo_actual == null
                                        ? null
                                        : Number(articulo.costo_actual) * Number(dep.cantidad_actual ?? 0);
                                    return (
                                        <Fragment key={dep.id}>
                                        <TableAppearRow index={index} className="border-t border-app-border-subtle align-middle">
                                            <td className="px-4 py-3"><InternalCode>{dep.codigo}</InternalCode></td>
                                            <td className="px-4 py-3 font-medium text-app-primary">{dep.nombre}</td>
                                            <td className="px-4 py-3 text-app-secondarytext">{dep.ubicacion || "—"}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{dep.cantidad_actual} {unidad}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{costo == null ? "—" : formatCurrency(costo)}</td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="table"
                                                    aria-label={`${open ? "Ocultar" : "Ver"} movimientos de ${dep.nombre}`}
                                                    aria-expanded={open}
                                                    onClick={() => setAbierto(open ? null : dep.id)}
                                                >
                                                    <ChevronDown
                                                        size={18}
                                                        strokeWidth={1.7}
                                                        className={cn("transition-transform", open && "rotate-180")}
                                                    />
                                                </Button>
                                            </td>
                                        </TableAppearRow>
                                        {open ? (
                                            <tr className="border-t border-app-border-subtle bg-app-subtle/40">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <p className="mb-3 text-xs text-app-mutedtext">
                                                        Movimientos de este artículo en {dep.codigo} – {dep.nombre}
                                                    </p>
                                                    <MovimientoTimeline
                                                        items={dep.movimientos}
                                                        unidad={unidad}
                                                        recambioLookup={recambioLookup}
                                                    />
                                                </td>
                                            </tr>
                                        ) : null}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </TableShell>
                )
            ) : null}
        </section>
    );
}
