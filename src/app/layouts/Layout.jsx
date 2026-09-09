import { useState } from "react";
import { useAlertasRecambio } from "@/hooks/use-alertas-recambio";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false);
    const { perfil } = usePerfilSesion();
    const hideSidebar = Boolean(perfil?.esResponsableDeposito);
    useAlertasRecambio(Boolean(perfil));

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-app-bg">
            <Navbar />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
                {hideSidebar ? null : (
                    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
                )}
                <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <div className="mx-auto min-h-full w-full max-w-office px-3 py-4 sm:px-5 md:px-8 md:py-8">
                        {children}
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}
