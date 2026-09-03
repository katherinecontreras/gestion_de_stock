import { cn } from "@/utils/cn";
const tones = {
    ok: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
    warning: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
    info: "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
    neutral: "bg-[#f1f5f9] text-[#334155] border-[#e2e8f0]",
    own: "bg-[#e0e7ff] text-[#3730a3] border-[#c7d2fe]",
    rental: "bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]",
    error: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]",
    trip: "bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]",
    assign: "bg-[#ccfbf1] text-[#115e59] border-[#99f6e4]",
    coupled: "bg-[#ede9fe] text-[#5b21b6] border-[#ddd6fe]",
};
export function Badge({ tone = "neutral", className, children, ...props }) {
    return (<span className={cn("inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...props}>
      {children}
    </span>);
}
export function InternalCode({ children }) {
    return (<span className="inline-flex rounded-[6px] bg-app-subtle px-1.5 py-0.5 font-mono text-[13px] font-semibold text-app-primary">
      {children}
    </span>);
}
export function EstadoBadge({ estado }) {
    const inactivo = estado === "inactivo";
    return (<Badge tone={inactivo ? "error" : "ok"}>{inactivo ? "Inactivo" : "Activo"}</Badge>);
}
export function EstadoSelect({ value, onChange, className }) {
    return (<select value={value} onChange={(event) => onChange(event.target.value)} className={cn("rounded-control border border-app-input bg-app-surface px-2 py-1.5 text-sm text-app-primary", "focus:border-app-focus focus:ring-1 focus:ring-app-focus", className)}>
      <option value="activo">Activo</option>
      <option value="inactivo">Inactivo</option>
    </select>);
}
