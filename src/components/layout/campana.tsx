"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { APP_ROUTES } from "@/utils/routes";
import { cn } from "@/utils/cn";

type CampanaProps = {
  unread?: boolean;
};

export function Campana({ unread = false }: CampanaProps) {
  return (
    <Link
      href={APP_ROUTES.notificaciones}
      aria-label="Notificaciones"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-app-secondarytext",
        "transition-colors duration-hover hover:bg-app-subtle",
      )}
    >
      <Bell size={24} strokeWidth={1.6} />
      {unread ? (
        <span className="absolute right-1.5 top-1.5 h-[10px] w-[10px] rounded-full border-2 border-white bg-app-danger" />
      ) : null}
    </Link>
  );
}
