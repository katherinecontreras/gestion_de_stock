import { Link } from "react-router-dom";
import { History, Settings, Users } from "lucide-react";
import { SPA_PATHS } from "@/utils/routes";
import { FloatingPanel } from "./floating-panel";
const ADMIN_LINKS = [
    {
        href: SPA_PATHS.responsables,
        label: "Administrar responsables",
        icon: Users,
    },
    {
        href: SPA_PATHS.notificaciones,
        label: "Historial de notificaciones",
        icon: History,
    },
];
export function AdminMenu({ open, onOpen, onClose }) {
    return (<FloatingPanel open={open} onClose={onClose} labelledBy="admin-menu-trigger" panelClassName="w-72 p-1.5" trigger={<button type="button" id="admin-menu-trigger" aria-label="Administración" aria-expanded={open} aria-haspopup="menu" onClick={() => (open ? onClose() : onOpen())} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-app-secondarytext transition-colors duration-hover hover:bg-app-subtle">
          <Settings size={24} strokeWidth={1.6}/>
        </button>}>
      {ADMIN_LINKS.map((item) => {
            const Icon = item.icon;
            return (<Link key={item.href} to={item.href} role="menuitem" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-app-secondarytext transition-colors duration-hover hover:bg-app-hover hover:text-app-primary">
            <Icon size={20} strokeWidth={1.6} className="shrink-0"/>
            {item.label}
          </Link>);
        })}
    </FloatingPanel>);
}
