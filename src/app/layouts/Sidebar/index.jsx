import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { NAV_ITEMS } from "../nav-items";

export function Sidebar({ collapsed, onToggle }) {
    const { pathname } = useLocation();
    const { perfil, loading } = usePerfilSesion();
    const iniciales = perfil?.iniciales ?? "—";
    const rol = perfil?.rol ?? (loading ? "…" : "Sin rol");
    const nombre = perfil?.nombreCompleto ?? (loading ? "Cargando…" : "Usuario");
    return (
        <aside
            className={cn(
                "relative z-20 shrink-0 border-b border-app-border bg-app-surface lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r lg:shadow-sidebar",
                "transition-[width] duration-sidebar ease-out",
                collapsed ? "lg:w-[5.5rem]" : "lg:w-[18rem]",
            )}
        >
            <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? "Expandir menú" : "Plegar menú"}
                className="absolute -right-2.5 top-20 z-30 hidden h-6 w-6 items-center justify-center rounded-full bg-app-secondary text-white lg:flex"
            >
                {collapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}
            </button>

            <nav
                className={cn(
                    "flex gap-1 overflow-x-auto overscroll-x-contain p-2 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-x-visible lg:p-3",
                    collapsed ? "lg:overflow-visible" : "lg:overflow-y-auto",
                )}
            >
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            aria-label={item.label}
                            className={cn(
                                "group relative flex min-w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[12px] font-semibold leading-tight text-app-secondarytext",
                                "transition-colors duration-hover",
                                "lg:min-w-0 lg:w-full lg:flex-row lg:justify-start lg:gap-3.5 lg:px-3.5 lg:py-3.5 lg:text-[15px]",
                                collapsed && "lg:justify-center lg:px-2 lg:py-3.5",
                                !active && "hover:bg-app-hover",
                                active && "text-app-primary",
                            )}
                        >
                            {active ? (
                                <motion.span
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 rounded-xl bg-app-bg"
                                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                />
                            ) : null}
                            <Icon size={24} strokeWidth={1.7} className="relative z-10 shrink-0" />
                            <span className={cn("relative z-10 line-clamp-2", collapsed && "lg:hidden")}>
                                {item.label}
                            </span>
                            {collapsed ? (
                                <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-primary shadow-modal lg:group-hover:flex">
                                    <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-app-border bg-app-surface" />
                                    {item.label}
                                </span>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            <div
                className={cn(
                    "mt-auto hidden border-t border-app-border-subtle p-3 lg:flex lg:items-center lg:gap-3",
                    collapsed && "lg:justify-center",
                )}
                aria-label={perfil ? `${perfil.nombreCompleto}, ${perfil.rol}` : "Perfil"}
            >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-secondary text-xs font-semibold tracking-wide text-white">
                    {iniciales}
                </span>
                {collapsed ? null : (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-app-primary">{rol}</p>
                        <p className="truncate text-xs text-app-mutedtext">{nombre}</p>
                    </div>
                )}
            </div>
        </aside>
    );
}
