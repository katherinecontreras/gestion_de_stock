import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export function ChartCard({ title, hint, className, children }) {
    return (
        <Card title={title} className={cn("relative z-0 flex min-h-[20rem] flex-col overflow-visible hover:z-30", className)}>
            {hint ? <p className="-mt-2 mb-3 text-xs text-app-mutedtext">{hint}</p> : null}
            <div className="min-h-0 flex-1 overflow-visible">{children}</div>
        </Card>
    );
}

export function ChartEmpty({ text = "No hay datos para mostrar." }) {
    return (
        <div className="flex h-full min-h-[14rem] items-center justify-center px-4 text-center text-sm text-app-mutedtext">
            {text}
        </div>
    );
}

function formatNumber(value) {
    return Number(value ?? 0).toLocaleString("es-AR");
}

function tooltipTitle(label, row) {
    if (row?.deposito) return row.deposito;
    if (row?.name && (typeof label === "number" || label == null || label === row.valor)) {
        return row.name;
    }
    if (row?.label && row?.tipo) return row.label;
    if (label != null && String(label).match(/^\d+$/)) return `Día ${label}`;
    if (label != null && label !== "") return String(label);
    return row?.name ?? null;
}

function RutaLines({ rutas }) {
    if (!rutas?.length) return null;
    return (
        <ul className="mt-1 space-y-0.5 border-t border-app-border-subtle pt-1">
            {rutas.map((item) => (
                <li key={item.ruta} className="text-[11px] leading-snug text-app-mutedtext">
                    <span className="font-medium text-app-secondarytext">{item.ruta}</span>
                    {item.movimientos > 0 && item.unidades > 0
                        ? ` · ${formatNumber(item.movimientos)} mov. · ${formatNumber(item.unidades)} un.`
                        : item.unidades > 0
                            ? ` · ${formatNumber(item.unidades)} un.`
                            : item.movimientos > 0
                                ? ` · ${formatNumber(item.movimientos)} mov.`
                                : ""}
                </li>
            ))}
        </ul>
    );
}

export function ChartTooltipBox({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload ?? {};
    const rows = payload.filter((item) => item.value != null && Number(item.value) !== 0);
    const visible = rows.length ? rows : payload;
    const title = tooltipTitle(label, row);
    if (!visible.length && title == null) return null;

    return (
        <div className="pointer-events-none relative z-50 max-h-72 w-max max-w-[20rem] overflow-y-auto rounded-xl border border-app-border bg-white px-3 py-2 text-xs shadow-modal">
            {title ? <p className="mb-1 font-semibold text-app-primary">{title}</p> : null}
            {row.codigo ? <p className="mb-1 text-[11px] text-app-mutedtext">Código: {row.codigo}</p> : null}
            {row.hint ? <p className="mb-1 text-[11px] text-app-mutedtext">{row.hint}</p> : null}
            {visible.map((item) => {
                const dataKey = item.dataKey ?? item.name;
                const detalle = row.detalle?.[dataKey] ?? (dataKey === "valor" || dataKey === item.name ? row.rutas : null);
                const valueLabel = formatter ? formatter(item.value) : formatNumber(item.value);
                const unidad = row.detalle?.[dataKey]
                    ? " mov."
                    : row.unidad
                        ? ` ${row.unidad}`
                        : "";
                return (
                    <div key={dataKey} className="mb-1 last:mb-0">
                        <p className="text-app-secondarytext">
                            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
                            {item.name}: {valueLabel}{unidad}
                        </p>
                        <RutaLines rutas={Array.isArray(detalle) ? [...detalle].sort((a, b) => (b.unidades - a.unidades) || (b.movimientos - a.movimientos)) : detalle} />
                    </div>
                );
            })}
        </div>
    );
}

export const CHART_TOOLTIP_PROPS = {
    content: ChartTooltipBox,
    animationDuration: 0,
    allowEscapeViewBox: { x: true, y: true },
    offset: 18,
    wrapperStyle: {
        zIndex: 50,
        pointerEvents: "none",
        outline: "none",
    },
};

