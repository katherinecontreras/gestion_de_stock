import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { FloatingPanel } from "./floating-panel";
function Field({ label, value }) {
    return (<div className="flex flex-col gap-0.5 px-4 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-app-faint">
        {label}
      </p>
      <p className="truncate text-sm text-app-primary">{value}</p>
    </div>);
}
export function PerfilMenu({ open, onOpen, onClose }) {
    const { perfil, loading } = usePerfilSesion();
    return (<div onMouseEnter={onOpen} onMouseLeave={onClose}>
      <FloatingPanel open={open} onClose={onClose} labelledBy="perfil-menu-trigger" panelClassName="w-80" trigger={<button type="button" id="perfil-menu-trigger" aria-label="Perfil" aria-expanded={open} aria-haspopup="menu" onClick={() => (open ? onClose() : onOpen())} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-app-secondary text-white transition-colors duration-hover hover:opacity-90">
            <User size={18} strokeWidth={1.6}/>
          </button>}>
        {loading && !perfil ? (<p className="px-4 py-8 text-center text-sm text-app-mutedtext">
            Cargando perfil…
          </p>) : null}
        {!loading && !perfil ? (<p className="px-4 py-8 text-center text-sm text-app-mutedtext">
            No se pudo cargar el perfil.
          </p>) : null}
        {perfil ? (<>
            <div className="flex items-center gap-3 border-b border-app-border-subtle bg-[#f5f4fd] px-4 py-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-secondary text-sm font-semibold tracking-wide text-white">
                {perfil.iniciales}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-primary">
                  {perfil.nombreCompleto}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="own">{perfil.rol}</Badge>
                  <Badge tone={perfil.estado === "Activo" ? "ok" : "error"}>
                    {perfil.estado}
                  </Badge>
                </div>
              </div>
            </div>
            <Field label="Nombre completo" value={perfil.nombreCompleto}/>
            <Field label="DNI" value={perfil.dni}/>
            <Field label="Email" value={perfil.email}/>
          </>) : null}
      </FloatingPanel>
    </div>);
}
