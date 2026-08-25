import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Bell,
  Layers,
  Package,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { APP_ROUTES } from "@/utils/routes";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: APP_ROUTES.articulos, label: "Artículos", icon: Package },
  { href: APP_ROUTES.familias, label: "Familias", icon: Layers },
  { href: APP_ROUTES.proveedores, label: "Proveedores", icon: Truck },
  { href: APP_ROUTES.depositos, label: "Depósitos", icon: Warehouse },
  { href: APP_ROUTES.movimientos, label: "Movimientos", icon: ArrowLeftRight },
  { href: APP_ROUTES.responsables, label: "Responsables", icon: Users },
  { href: APP_ROUTES.notificaciones, label: "Avisos", icon: Bell },
];
