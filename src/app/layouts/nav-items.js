import { ArrowLeftRight, Layers, Package, Truck, Warehouse, } from "lucide-react";
import { SPA_PATHS } from "@/utils/routes";
export const NAV_ITEMS = [
    { href: SPA_PATHS.articulos, label: "Artículos", icon: Package },
    { href: SPA_PATHS.familias, label: "Familias", icon: Layers },
    { href: SPA_PATHS.proveedores, label: "Proveedores", icon: Truck },
    { href: SPA_PATHS.depositos, label: "Depósitos", icon: Warehouse },
    { href: SPA_PATHS.movimientos, label: "Movimientos", icon: ArrowLeftRight },
];
export const RESPONSABLE_NAV_ITEMS = NAV_ITEMS.filter((item) => (
    item.href === SPA_PATHS.articulos
    || item.href === SPA_PATHS.depositos
    || item.href === SPA_PATHS.movimientos
));
