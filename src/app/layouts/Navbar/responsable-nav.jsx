import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { RESPONSABLE_NAV_ITEMS } from "../nav-items";
import { LogoutButton } from "./logout-button";

function navActive(pathname, href) {
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function ResponsableDesktopNav() {
    const { pathname } = useLocation();
    return (
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación">
            {RESPONSABLE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = navActive(pathname, item.href);
                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-app-secondarytext",
                            "transition-colors duration-hover hover:bg-app-hover hover:text-app-primary",
                            active && "bg-app-bg text-app-primary",
                        )}
                    >
                        <Icon size={18} strokeWidth={1.7} />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

export function ResponsableMobileMenu({ open, onOpen, onClose, perfil, loading }) {
    const { pathname } = useLocation();

    return (
        <>
            <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-app-secondarytext transition-colors duration-hover hover:bg-app-subtle lg:hidden"
                aria-label={open ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={open}
                onClick={() => (open ? onClose() : onOpen())}
            >
                {open ? <X size={24} strokeWidth={1.6} /> : <Menu size={24} strokeWidth={1.6} />}
            </button>
            <AnimatePresence>
                {open ? (
                    <motion.div
                        className="fixed inset-x-0 top-14 z-20 overflow-y-auto border-b border-app-border bg-app-surface shadow-modal lg:hidden"
                        initial={{ y: "-12%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "-8%", opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <nav className="flex flex-col gap-1 p-4" aria-label="Navegación">
                            {RESPONSABLE_NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const active = navActive(pathname, item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold text-app-secondarytext",
                                            "transition-colors duration-hover hover:bg-app-hover",
                                            active && "bg-app-bg text-app-primary",
                                        )}
                                    >
                                        <Icon size={22} strokeWidth={1.7} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="border-t border-app-border-subtle p-4">
                            {loading && !perfil ? (
                                <p className="mb-4 text-sm text-app-mutedtext">Cargando perfil…</p>
                            ) : null}
                            {perfil ? (
                                <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#f5f4fd] px-4 py-3">
                                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-secondary text-sm font-semibold tracking-wide text-white">
                                        {perfil.iniciales}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-app-primary">
                                            {perfil.nombreCompleto}
                                        </p>
                                        <p className="truncate text-xs text-app-mutedtext">{perfil.email}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <Badge tone="own">{perfil.rol}</Badge>
                                            <Badge tone={perfil.estado === "Activo" ? "ok" : "error"}>
                                                {perfil.estado}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            <LogoutButton forceLabel className="ml-0 w-full" />
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </>
    );
}
