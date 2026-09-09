import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/utils/cn";
import { useCampanaNotificaciones } from "@/hooks/use-campana-notificaciones";
import { FloatingPanel } from "./floating-panel";
export function Campana({ open, onOpen, onClose }) {
    const { items, unreadCount, loading, markAllRead } = useCampanaNotificaciones();
    const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);
    const wasOpen = useRef(false);
    useEffect(() => {
        if (open) {
            wasOpen.current = true;
            return;
        }
        if (!wasOpen.current)
            return;
        wasOpen.current = false;
        void markAllRead();
    }, [open, markAllRead]);
    return (<FloatingPanel open={open} onClose={onClose} labelledBy="campana-trigger" panelClassName="w-[min(22rem,calc(100vw-1.5rem))]" trigger={<button type="button" id="campana-trigger" aria-label={unreadCount > 0
                ? `Notificaciones, ${unreadCount} sin leer`
                : "Notificaciones"} aria-expanded={open} aria-haspopup="menu" onClick={() => (open ? onClose() : onOpen())} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-app-secondarytext transition-colors duration-hover hover:bg-app-subtle">
          <Bell size={24} strokeWidth={1.6}/>
          {unreadCount > 0 ? (<span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-app-danger px-1 text-[11px] font-bold leading-none text-white">
              {badgeLabel}
            </span>) : null}
        </button>}>
      <div className="border-b border-app-border-subtle px-4 py-3">
        <p className="text-sm font-semibold text-app-primary">Notificaciones</p>
        <p className="text-xs text-app-mutedtext">
          {unreadCount > 0
            ? `${unreadCount} sin leer`
            : "No hay avisos pendientes"}
        </p>
      </div>
      <ul className="max-h-[16.5rem] overflow-y-auto">
        {loading && items.length === 0 ? (<li className="px-4 py-8 text-center text-sm text-app-mutedtext">
            Cargando avisos…
          </li>) : null}
        {!loading && items.length === 0 ? (<li className="px-4 py-8 text-center text-sm text-app-mutedtext">
            Todavía no hay notificaciones.
          </li>) : null}
        {items.map((item) => (<li key={item.id} className="border-b border-app-border-subtle last:border-b-0">
            <div className={cn("flex w-full gap-3 px-4 py-3 text-left", !item.read && "bg-app-success-bg")}>
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", !item.read ? "bg-app-success" : "bg-transparent")}/>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-app-primary">
                  {item.title}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-app-mutedtext">
                  {item.body}
                </p>
                {item.actor ? (<p className="mt-1 text-[12px] text-app-secondarytext">
                    por {item.actor}
                  </p>) : null}
                <p className="mt-1 text-[11px] text-app-faint">{item.time}</p>
              </div>
            </div>
          </li>))}
      </ul>
    </FloatingPanel>);
}
