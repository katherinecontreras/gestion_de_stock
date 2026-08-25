"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/utils/cn";
import { NAV_ITEMS } from "../nav-items";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative z-20 shrink-0 border-b border-app-border bg-app-surface lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r lg:shadow-sidebar",
        "transition-[width] duration-sidebar ease-out",
        collapsed ? "lg:w-20" : "lg:w-[16.5rem]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menú" : "Plegar menú"}
        className="absolute -right-2.5 top-20 z-30 hidden h-5 w-5 items-center justify-center rounded-full bg-app-secondary text-white lg:flex"
      >
        {collapsed ? (
          <ChevronRight size={12} strokeWidth={2} />
        ) : (
          <ChevronLeft size={12} strokeWidth={2} />
        )}
      </button>

      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-3">
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="shrink-0 lg:w-full"
            >
              <Link
                href={item.href}
                title={item.label}
                className={cn(
                  "flex w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] px-2 py-2 text-center text-[11px] font-medium leading-tight text-app-secondarytext",
                  "transition-colors duration-hover hover:bg-app-hover",
                  "lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 lg:text-sm",
                  collapsed && "lg:justify-center lg:px-2",
                  active && "bg-app-bg text-app-primary",
                )}
              >
                <Icon size={20} strokeWidth={1.6} className="shrink-0" />
                <span className={cn("line-clamp-2", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto hidden border-t border-app-border-subtle p-3 lg:flex lg:items-center lg:gap-3",
          collapsed && "lg:justify-center",
        )}
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-secondary text-xs font-semibold text-white">
          SS
        </span>
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-app-primary">
              Simetra
            </p>
            <p className="truncate text-xs text-app-mutedtext">Operador</p>
          </div>
        )}
      </div>
    </aside>
  );
}
