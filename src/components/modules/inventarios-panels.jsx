import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, InternalCode } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { useToast } from "@/app/layouts/ToastProvider";
import { explainInventarioError, listInventarioArticulos, listInventarioEpp } from "@/services/inventario";
import { formatCurrency, formatDate, formatNombreCompleto } from "@/utils/format";
import { cn } from "@/utils/cn";

function depositoOptions(depositos) {
    return (depositos ?? []).map((dep) => ({
        value: dep.id,
        label: `${dep.codigo} – ${dep.nombre}`,
    }));
}

export function InventarioArticulosPanel({ depositos = [] }) {
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [idDeposito, setIdDeposito] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listInventarioArticulos({ idDeposito })
            .then((data) => {
                if (!cancelled) setRows(data);
            })
            .catch((error) => {
                if (!cancelled) notify(explainInventarioError(error), "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [idDeposito, notify]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => [
            row.codigo, row.nombre, row.deposito_codigo, row.deposito_nombre,
            row.familia_codigo, row.familia_descripcion, row.grupo_codigo, row.grupo_descripcion,
        ].join(" ").toLowerCase().includes(term));
    }, [rows, search]);

    return (
        <TableShell
            toolbar={
                <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                    <label className="relative block min-w-[12rem] flex-1">
                        <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar artículo o depósito"
                            className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                        />
                    </label>
                    <SearchSelect
                        value={idDeposito}
                        onChange={setIdDeposito}
                        emptyOption="Todos los depósitos"
                        placeholder="Buscar depósito…"
                        className="w-full lg:w-72"
                        options={depositoOptions(depositos)}
                    />
                    {!loading ? (
                        <p className="text-xs text-app-mutedtext lg:ml-auto">
                            {visible.length === 0 ? "0 artículos en stock" : `${visible.length} filas de stock`}
                        </p>
                    ) : null}
                </div>
            }
            empty={loading ? undefined : visible.length === 0 ? "No hay stock para mostrar en estos depósitos." : undefined}
        >
            {loading ? (
                <TableGhost
                    minWidth="64rem"
                    columns={[
                        { label: "Depósito" },
                        { label: "Código" },
                        { label: "Artículo" },
                        { label: "Familia" },
                        { label: "Grupo" },
                        { label: "Stock", align: "right" },
                    ]}
                />
            ) : visible.length > 0 ? (
                <table className="w-full min-w-[64rem] text-left text-sm">
                    <thead className="bg-app-muted text-app-mutedtext">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Depósito</th>
                            <th className="px-4 py-3 font-semibold">Código</th>
                            <th className="px-4 py-3 font-semibold">Artículo</th>
                            <th className="px-4 py-3 font-semibold">Familia</th>
                            <th className="px-4 py-3 font-semibold">Grupo</th>
                            <th className="px-4 py-3 text-right font-semibold">Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, index) => (
                            <TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                                <td className="px-4 py-3 text-app-secondarytext">{row.deposito_codigo} – {row.deposito_nombre}</td>
                                <td className="px-4 py-3"><InternalCode>{row.codigo}</InternalCode></td>
                                <td className="px-4 py-3 font-medium text-app-primary">
                                    {row.nombre}
                                    {row.is_epp ? <Badge tone="info" className="ml-2">EPP</Badge> : null}
                                </td>
                                <td className="px-4 py-3 text-app-secondarytext">{row.familia_codigo ? `${row.familia_codigo} – ${row.familia_descripcion}` : "—"}</td>
                                <td className="px-4 py-3 text-app-secondarytext">{row.grupo_codigo ? `${row.grupo_codigo} – ${row.grupo_descripcion}` : "—"}</td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {row.cantidad_actual} {row.unidad_de_medida}
                                </td>
                            </TableAppearRow>
                        ))}
                    </tbody>
                </table>
            ) : null}
        </TableShell>
    );
}

export function InventarioEppPanel({ depositos = [] }) {
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [idDeposito, setIdDeposito] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listInventarioEpp({ idDeposito })
            .then((data) => {
                if (!cancelled) setRows(data);
            })
            .catch((error) => {
                if (!cancelled) notify(explainInventarioError(error), "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [idDeposito, notify]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => [
            row.codigo, row.nombre, row.deposito_codigo, row.deposito_nombre,
            row.empleado_nombre, row.empleado_apellido, row.empleado_dni,
        ].join(" ").toLowerCase().includes(term));
    }, [rows, search]);

    return (
        <TableShell
            toolbar={
                <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                    <label className="relative block min-w-[12rem] flex-1">
                        <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar empleado, artículo o depósito"
                            className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                        />
                    </label>
                    <SearchSelect
                        value={idDeposito}
                        onChange={setIdDeposito}
                        emptyOption="Todos los depósitos"
                        placeholder="Buscar depósito…"
                        className="w-full lg:w-72"
                        options={depositoOptions(depositos)}
                    />
                    {!loading ? (
                        <p className="text-xs text-app-mutedtext lg:ml-auto">
                            {visible.length === 0 ? "0 entregas EPP" : `${visible.length} entregas`}
                        </p>
                    ) : null}
                </div>
            }
            empty={loading ? undefined : visible.length === 0 ? "No hay inventario EPP para mostrar." : undefined}
        >
            {loading ? (
                <TableGhost
                    minWidth="72rem"
                    columns={[
                        { label: "Depósito" },
                        { label: "Empleado" },
                        { label: "Artículo" },
                        { label: "Cantidad", align: "right" },
                        { label: "Recambio" },
                        { label: "Días" },
                    ]}
                />
            ) : visible.length > 0 ? (
                <table className="w-full min-w-[72rem] text-left text-sm">
                    <thead className="bg-app-muted text-app-mutedtext">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Depósito</th>
                            <th className="px-4 py-3 font-semibold">Empleado</th>
                            <th className="px-4 py-3 font-semibold">Artículo</th>
                            <th className="px-4 py-3 text-right font-semibold">Cantidad</th>
                            <th className="px-4 py-3 font-semibold">Fecha recambio</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((row, index) => (
                            <TableAppearRow
                                key={row.id}
                                index={index}
                                className={cn(
                                    "border-t border-app-border-subtle align-middle",
                                    row.debe_recambiar && "bg-[#fef2f2]",
                                )}
                            >
                                <td className="px-4 py-3 text-app-secondarytext">{row.deposito_codigo} – {row.deposito_nombre}</td>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-app-primary">{formatNombreCompleto(row.empleado_nombre, row.empleado_apellido) || "—"}</p>
                                    <p className="text-xs text-app-mutedtext">{row.empleado_dni}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <InternalCode>{row.codigo}</InternalCode>
                                    <span className="ml-2 font-medium text-app-primary">{row.nombre}</span>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">{row.cantidad}</td>
                                <td className="px-4 py-3 tabular-nums text-app-secondarytext">{formatDate(row.fecha_recambio)}</td>
                                <td className="px-4 py-3">
                                    {row.debe_recambiar ? (
                                        <Badge tone="error">Debe recambiarse</Badge>
                                    ) : row.dias_recambio == null ? (
                                        <Badge tone="neutral">Sin fecha</Badge>
                                    ) : (
                                        <Badge tone={row.dias_recambio <= 7 ? "warning" : "ok"}>
                                            {row.dias_recambio === 1 ? "1 día" : `${row.dias_recambio} días`}
                                        </Badge>
                                    )}
                                </td>
                            </TableAppearRow>
                        ))}
                    </tbody>
                </table>
            ) : null}
        </TableShell>
    );
}

export function InventarioDepositoModal({ deposito, onClose }) {
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!deposito?.id) return undefined;
        let cancelled = false;
        setLoading(true);
        listInventarioArticulos({ idDeposito: deposito.id })
            .then((data) => {
                if (!cancelled) setRows(data);
            })
            .catch((error) => {
                if (!cancelled) notify(explainInventarioError(error), "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [deposito?.id, notify]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) => `${row.codigo} ${row.nombre} ${row.familia_codigo} ${row.grupo_codigo}`.toLowerCase().includes(term));
    }, [rows, search]);

    if (!deposito) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
            <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-app-overlay" onClick={onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="inventario-deposito-title" className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-app-border bg-app-surface p-5 shadow-modal">
                <h2 id="inventario-deposito-title" className="text-lg font-semibold text-app-primary">
                    Inventario · {deposito.nombre}
                </h2>
                <p className="mt-1 text-sm text-app-mutedtext">
                    Stock actual: {Number(deposito.cant_articulos ?? 0)} artículos · {formatCurrency(Number(deposito.costo_total ?? 0))}
                </p>
                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-hidden">
                    <label className="relative block">
                        <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por código o nombre"
                            className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                        />
                    </label>
                    <div className="max-h-[28rem] overflow-auto rounded-xl border border-app-border-subtle">
                        {loading ? (
                            <p className="px-4 py-8 text-center text-sm text-app-mutedtext">Cargando inventario…</p>
                        ) : filtered.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-app-mutedtext">
                                {search.trim() ? "No hay artículos que coincidan." : "Este depósito no tiene stock cargado."}
                            </p>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-app-muted text-app-mutedtext">
                                    <tr>
                                        <th className="px-3 py-2">Código</th>
                                        <th className="px-3 py-2">Artículo</th>
                                        <th className="px-3 py-2">Familia</th>
                                        <th className="px-3 py-2 text-right">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((row) => (
                                        <tr key={row.id} className="border-t border-app-border-subtle">
                                            <td className="px-3 py-2"><InternalCode>{row.codigo}</InternalCode></td>
                                            <td className="px-3 py-2 font-medium text-app-primary">
                                                {row.nombre}
                                                {row.is_epp ? <Badge tone="info" className="ml-2">EPP</Badge> : null}
                                            </td>
                                            <td className="px-3 py-2 text-app-secondarytext">{row.familia_codigo ? `${row.familia_codigo} – ${row.familia_descripcion}` : "—"}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{row.cantidad_actual} {row.unidad_de_medida}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </div>
    );
}
