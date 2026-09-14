import { useEffect, useMemo, useRef, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { CHART_COLORS, MESES_LABEL, buildDashboardView, buildPeriodOptions, defaultPeriod, depositosConMovimientos, explainDashboardError, loadDashboard, loadDashboardMovimientos } from "@/services/dashboard";
import { CHART_TOOLTIP_PROPS, ChartCard, ChartEmpty } from "@/components/modules/dashboard-charts";
import { labelTipoMovimiento } from "@/utils/movimientos";
import { cn } from "@/utils/cn";

const TIPO_KEYS = ["Entrada", "Salida", "Transferencia", "Entrega_EPP"];
const AXIS = { fontSize: 11, fill: "#64748b" };
const GRID = { stroke: "#e2e8f0", strokeDasharray: "3 3" };
const SELECT_CLASS = "w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus";

function hasValues(rows, keys) {
    return (rows ?? []).some((row) => keys.some((key) => Number(row[key] ?? 0) > 0));
}

function shortName(value, max = 18) {
    const text = String(value ?? "");
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
}

function FilterSelect({ label, value, onChange, children, className }) {
    return (
        <label className={cn("flex min-w-[7rem] flex-col gap-1.5", className)}>
            <span className="sr-only">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={SELECT_CLASS}
                aria-label={label}
            >
                {children}
            </select>
        </label>
    );
}

function KpiCard({ label, value, hint }) {
    return (
        <Card className="min-h-[6.5rem]">
            <p className="text-xs font-medium text-app-mutedtext">{label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-app-primary">
                {Number(value ?? 0).toLocaleString("es-AR")}
            </p>
            {hint ? <p className="mt-1 text-xs text-app-faint">{hint}</p> : null}
        </Card>
    );
}

export function DashboardScreen() {
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const [payload, setPayload] = useState(null);
    const [idDeposito, setIdDeposito] = useState("");
    const [year, setYear] = useState(null);
    const [month, setMonth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const skipPeriodFetch = useRef(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        loadDashboard()
            .then((result) => {
                if (cancelled) return;
                skipPeriodFetch.current = true;
                setPayload(result);
                setYear(result.year);
                setMonth(result.month);
                setError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(explainDashboardError(err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const periodOptions = useMemo(
        () => buildPeriodOptions(payload?.fechas ?? [], idDeposito),
        [payload?.fechas, idDeposito],
    );
    const years = periodOptions.years.length
        ? periodOptions.years
        : [year ?? new Date().getFullYear()];
    const months = periodOptions.monthsFor(year).length
        ? periodOptions.monthsFor(year)
        : [month ?? new Date().getMonth() + 1];
    const depositosFiltro = useMemo(
        () => depositosConMovimientos(payload?.depositos ?? [], payload?.fechas ?? [], year, month),
        [payload?.depositos, payload?.fechas, year, month],
    );

    useEffect(() => {
        if (!idDeposito) return;
        if (!depositosFiltro.some((dep) => String(dep.id) === String(idDeposito))) {
            setIdDeposito("");
        }
    }, [idDeposito, depositosFiltro]);

    useEffect(() => {
        if (year == null || month == null || !payload) return;
        const opts = buildPeriodOptions(payload.fechas ?? [], idDeposito);
        if (!opts.years.length) return;
        if (!opts.years.includes(year) || !opts.monthsFor(year).includes(month)) {
            const next = defaultPeriod(payload.fechas ?? [], idDeposito);
            setYear(next.year);
            setMonth(next.month);
        }
    }, [idDeposito, year, month, payload]);

    useEffect(() => {
        if (year == null || month == null) return;
        if (skipPeriodFetch.current) {
            skipPeriodFetch.current = false;
            return;
        }
        let cancelled = false;
        loadDashboardMovimientos(year, month)
            .then((period) => {
                if (cancelled) return;
                setPayload((prev) => (prev ? { ...prev, ...period, year, month } : prev));
                setError(null);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(explainDashboardError(err));
            });
        return () => { cancelled = true; };
    }, [year, month]);

    const data = useMemo(() => {
        if (!payload) return null;
        return buildDashboardView({
            stock: payload.stock,
            epp: payload.epp,
            movimientos: payload.movimientos,
            dias: payload.dias,
            idDeposito,
        });
    }, [payload, idDeposito]);

    const veTodo = Boolean(perfil?.veTodaLaPlataforma || perfil?.esAdministrador || perfil?.esVistaDescarga);
    const depositoElegido = depositosFiltro.find((dep) => String(dep.id) === String(idDeposito));
    const alcance = depositoElegido
        ? `Solo ${depositoElegido.label}.`
        : veTodo
            ? "Toda la plataforma. Podés filtrar por depósito, mes y año."
            : "Tus depósitos. Podés filtrar por uno, mes y año.";

    if (loading || perfilLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <section>
            <PageHeader
                title="Dashboard"
                description={`Tablero de ${payload?.mesLabel ?? "este mes"}. ${alcance}`}
                actions={(
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                        <FilterSelect
                            label="Mes"
                            value={month ?? ""}
                            onChange={(value) => setMonth(Number(value))}
                            className="min-w-[9.5rem] sm:w-40"
                        >
                            {months.map((value) => (
                                <option key={value} value={value}>{MESES_LABEL[value - 1]}</option>
                            ))}
                        </FilterSelect>
                        <FilterSelect
                            label="Año"
                            value={year ?? ""}
                            onChange={(value) => {
                                const nextYear = Number(value);
                                setYear(nextYear);
                                const nextMonths = periodOptions.monthsFor(nextYear);
                                if (!nextMonths.includes(month) && nextMonths.length) {
                                    setMonth(nextMonths[nextMonths.length - 1]);
                                }
                            }}
                            className="min-w-[6.5rem] sm:w-28"
                        >
                            {years.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </FilterSelect>
                        <FilterSelect
                            label="Depósito"
                            value={idDeposito}
                            onChange={setIdDeposito}
                            className="min-w-[16rem] sm:w-72"
                        >
                            <option value="">Todos los depósitos</option>
                            {depositosFiltro.map((dep) => (
                                <option key={dep.id} value={dep.id}>{dep.label}</option>
                            ))}
                        </FilterSelect>
                    </div>
                )}
            />
            {error ? <Alert className="mb-4">{error}</Alert> : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Movimientos del mes" value={data?.kpis.movimientosMes ?? 0} hint="Entradas, salidas, transferencias y EPP" />
                <KpiCard label="Unidades en stock" value={data?.kpis.unidadesStock ?? 0} hint="Inventario de artículos" />
                <KpiCard label="EPP a recambiar" value={data?.kpis.eppARecambiar ?? 0} hint="Ya venció la fecha de recambio" />
                <KpiCard label="Stock en cero" value={data?.kpis.stockCero ?? 0} hint="Filas de inventario en 0" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-6">
                <ChartCard
                    className="xl:col-span-4"
                    title="Movimientos del mes"
                    hint="Cantidad de movimientos por día y tipo. En el detalle se ve origen y destino."
                >
                    {hasValues(data?.movimientosPorDia, TIPO_KEYS) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.movimientosPorDia} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="label" tick={AXIS} />
                                <YAxis allowDecimals={false} tick={AXIS} />
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => labelTipoMovimiento(value)} />
                                {TIPO_KEYS.map((tipo) => (
                                    <Area
                                        key={tipo}
                                        type="monotone"
                                        dataKey={tipo}
                                        name={labelTipoMovimiento(tipo)}
                                        stroke={CHART_COLORS[tipo]}
                                        fill={CHART_COLORS[tipo]}
                                        fillOpacity={0.15}
                                        strokeWidth={2}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="Todavía no hay movimientos este mes." />
                    )}
                </ChartCard>

                <ChartCard
                    className="xl:col-span-2"
                    title="Mix de movimientos"
                    hint="Proporción por tipo en el mes, con origen y destino."
                >
                    {hasValues(data?.mixTipos, ["valor"]) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={data.mixTipos.filter((row) => row.valor > 0)}
                                    dataKey="valor"
                                    nameKey="label"
                                    innerRadius={58}
                                    outerRadius={88}
                                    paddingAngle={2}
                                    isAnimationActive={false}
                                >
                                    {data.mixTipos.filter((row) => row.valor > 0).map((row) => (
                                        <Cell key={row.tipo} fill={row.color} />
                                    ))}
                                </Pie>
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="Sin movimientos para armar el mix." />
                    )}
                </ChartCard>

                <ChartCard
                    className="xl:col-span-3"
                    title="Stock por depósito"
                    hint="Unidades actuales (hasta 8 depósitos)"
                >
                    {hasValues(data?.stockDepositos, ["valor"]) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                                data={data.stockDepositos}
                                layout="vertical"
                                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                            >
                                <CartesianGrid {...GRID} horizontal={false} />
                                <XAxis type="number" tick={AXIS} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" width={110} tick={{ ...AXIS, width: 100 }} tickFormatter={(value) => shortName(value, 16)} />
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Bar dataKey="valor" name="Unidades" fill={CHART_COLORS.barra} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="No hay stock cargado en estos depósitos." />
                    )}
                </ChartCard>

                <ChartCard
                    className="xl:col-span-3"
                    title="Recambio EPP por depósito"
                    hint="Pendiente, vencido y recambiado en el mes"
                >
                    {hasValues(data?.eppRecambio, ["pendiente", "debe", "recambiado"]) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.eppRecambio} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="deposito" tick={AXIS} tickFormatter={(value) => shortName(value, 10)} />
                                <YAxis allowDecimals={false} tick={AXIS} />
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="pendiente" name="Pendiente" stackId="epp" fill={CHART_COLORS.pendiente} isAnimationActive={false} />
                                <Bar dataKey="debe" name="Debe recambiarse" stackId="epp" fill={CHART_COLORS.debe} isAnimationActive={false} />
                                <Bar dataKey="recambiado" name="Recambiado (mes)" stackId="epp" fill={CHART_COLORS.recambiado} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="No hay inventario EPP ni recambios este mes." />
                    )}
                </ChartCard>

                <ChartCard
                    className="xl:col-span-2"
                    title="Stock por familia"
                    hint="Dónde está concentrado el inventario"
                >
                    {hasValues(data?.stockFamilias, ["valor"]) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.stockFamilias} margin={{ top: 8, right: 8, left: -12, bottom: 32 }}>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="name" tick={AXIS} interval={0} angle={-25} textAnchor="end" tickFormatter={(value) => shortName(value, 12)} />
                                <YAxis allowDecimals={false} tick={AXIS} />
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Bar dataKey="valor" name="Unidades" fill={CHART_COLORS.Transferencia} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="No hay stock agrupado por familia." />
                    )}
                </ChartCard>

                <ChartCard
                    className="xl:col-span-2"
                    title="Artículos más movidos"
                    hint="Suma de cantidades del mes. El detalle muestra de qué depósito a cuál."
                >
                    {hasValues(data?.topArticulos, ["valor"]) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                                data={data.topArticulos}
                                layout="vertical"
                                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                            >
                                <CartesianGrid {...GRID} horizontal={false} />
                                <XAxis type="number" tick={AXIS} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" width={120} tick={{ ...AXIS, width: 110 }} tickFormatter={(value) => shortName(value, 18)} />
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Bar dataKey="valor" name="Cantidad" fill={CHART_COLORS.Entrega_EPP} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="Este mes no se movieron artículos." />
                    )}
                </ChartCard>

                <ChartCard
                    className="xl:col-span-2"
                    title="Entregas EPP por tipo"
                    hint="Ingreso, recambio por rotura y por talle, con depósito de origen y destino."
                >
                    {hasValues(data?.eppTipos, ["valor"]) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.eppTipos} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                                <CartesianGrid {...GRID} />
                                <XAxis dataKey="label" tick={AXIS} interval={0} />
                                <YAxis allowDecimals={false} tick={AXIS} />
                                <Tooltip {...CHART_TOOLTIP_PROPS} />
                                <Bar dataKey="valor" name="Cantidad" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                    {data.eppTipos.map((row) => (
                                        <Cell key={row.tipo} fill={row.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <ChartEmpty text="No hay entregas EPP este mes." />
                    )}
                </ChartCard>
            </div>
        </section>
    );
}
