import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Brand } from "@/components/layout/brand";
import { Campana } from "@/components/layout/campana";
import { AdminMenu } from "@/components/layout/admin-menu";
import { PerfilMenu } from "@/components/layout/perfil-menu";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { LogoutButton } from "./logout-button";
import { ResponsableDesktopNav, ResponsableMobileMenu } from "./responsable-nav";

export function Navbar() {
    const { pathname } = useLocation();
    const { perfil, loading } = usePerfilSesion();
    const [openMenu, setOpenMenu] = useState(null);
    const isResponsable = Boolean(perfil?.esResponsableDeposito);
    const showAdminMenu = Boolean(perfil?.esAdministrador || perfil?.esVistaDescarga);

    useEffect(() => {
        setOpenMenu(null);
    }, [pathname]);

    return (
        <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-app-border bg-app-surface px-4 py-3">
            <Brand />
            <div className="flex items-center gap-1 sm:gap-2">
                {isResponsable ? <ResponsableDesktopNav /> : null}
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
                {isResponsable ? (
                    <>
                        <div className="hidden lg:block">
                            <PerfilMenu
                                open={openMenu === "perfil"}
                                onOpen={() => setOpenMenu("perfil")}
                                onClose={() => setOpenMenu(null)}
                            />
                        </div>
                        <div className="hidden lg:block">
                            <LogoutButton />
                        </div>
                        <ResponsableMobileMenu
                            open={openMenu === "nav"}
                            onOpen={() => setOpenMenu("nav")}
                            onClose={() => setOpenMenu(null)}
                            perfil={perfil}
                            loading={loading}
                        />
                    </>
                ) : (
                    <>
                        <PerfilMenu
                            open={openMenu === "perfil"}
                            onOpen={() => setOpenMenu("perfil")}
                            onClose={() => setOpenMenu(null)}
                        />
                        <LogoutButton />
                    </>
                )}
            </div>
        </header>
    );
}
