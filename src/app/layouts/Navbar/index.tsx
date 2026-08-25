"use client";

import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import { Campana } from "@/components/layout/campana";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/utils/routes";

export function Navbar() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-app-border bg-app-surface px-4 py-3">
      <Brand />
      <div className="flex items-center gap-1 sm:gap-2">
        <Campana unread />
        <Link
          href={APP_ROUTES.responsables}
          aria-label="Administración"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-app-secondarytext transition-colors duration-hover hover:bg-app-subtle"
        >
          <Settings size={24} strokeWidth={1.6} />
        </Link>
        <span
          aria-label="Perfil"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-app-secondary text-xs font-semibold text-white"
        >
          <User size={18} strokeWidth={1.6} />
        </span>
        <Button variant="logout" className="ml-1">
          <LogOut size={16} strokeWidth={1.6} />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    </header>
  );
}
