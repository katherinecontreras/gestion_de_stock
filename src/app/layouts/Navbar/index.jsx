import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Brand } from "@/components/layout/brand";
import { Campana } from "@/components/layout/campana";
import { AdminMenu } from "@/components/layout/admin-menu";
import { PerfilMenu } from "@/components/layout/perfil-menu";
import { AdministrarDepositosModal } from "@/components/modals/administrar-depositos-modal";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { SPA_PATHS } from "@/utils/routes";
import { LogoutButton } from "./logout-button";

export function Navbar() {
    const { pathname } = useLocation();
    const { perfil } = usePerfilSesion();
    const [openMenu, setOpenMenu] = useState(null);
    const [depositosOpen, setDepositosOpen] = useState(false);
    const showAdminMenu = Boolean(perfil?.esAdministrador || perfil?.esVistaDescarga);
    const showDepositos = Boolean(perfil?.esResponsableDeposito)
        && !perfil?.esAdministrador
        && !perfil?.esVistaDescarga;

    useEffect(() => {
        setOpenMenu(null);
    }, [pathname]);

    return (
        <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-app-border bg-app-surface px-3 py-2.5 sm:px-4 sm:py-3">
            <Brand
                to={SPA_PATHS.dashboard}
                className="min-w-0 [&>span]:hidden min-[420px]:[&>span]:inline"
            />
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
                <Campana
                    open={openMenu === "bell"}
                    onOpen={() => setOpenMenu("bell")}
                    onClose={() => setOpenMenu(null)}
                />
                {showAdminMenu ? (
                    <AdminMenu
                        open={openMenu === "admin"}
                        onOpen={() => setOpenMenu("admin")}
                        onClose={() => setOpenMenu(null)}
                    />
                ) : null}
                <PerfilMenu
                    open={openMenu === "perfil"}
                    onOpen={() => setOpenMenu("perfil")}
                    onClose={() => setOpenMenu(null)}
                    onAdministrarDepositos={showDepositos ? () => setDepositosOpen(true) : undefined}
                />
                <LogoutButton />
            </div>
            {showDepositos ? (
                <AdministrarDepositosModal
                    open={depositosOpen}
                    onClose={() => setDepositosOpen(false)}
                />
            ) : null}
        </header>
    );
}
