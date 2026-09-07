import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase/env";
const ROL_LABEL = {
    Administrador: "Administrador",
    Responsable_Deposito: "Responsable de depósito",
    Vista_Consulta: "Vista consulta",
    Vista_Descarga: "Vista y descarga",
};
function inicialesDe(nombre, apellido) {
    const n = nombre.trim().charAt(0);
    const a = apellido.trim().charAt(0);
    return `${n}${a}`.toUpperCase() || "?";
}
function labelRol(tipo) {
    if (!tipo)
        return "Sin rol";
    if (tipo in ROL_LABEL)
        return ROL_LABEL[tipo];
    return tipo.replaceAll("_", " ");
}
export function usePerfilSesion() {
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!getSupabaseEnv().isConfigured) {
            setPerfil(null);
            setLoading(false);
            return;
        }
        const supabase = createBrowserClient();
        let cancelled = false;
        async function load() {
            const { data: { session }, } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                if (!cancelled) {
                    setPerfil(null);
                    setLoading(false);
                }
                return;
            }
            const { data } = await supabase
                .from("responsables")
                .select("id, nombre, apellido, dni, email, estado, roles ( tipo )")
                .eq("auth_user_id", user.id)
                .eq("estado", "activo")
                .maybeSingle();
            if (cancelled)
                return;
            if (!data) {
                setPerfil(null);
                setLoading(false);
                return;
            }
            const rolEmbed = data.roles;
            const tipo = Array.isArray(rolEmbed) ? rolEmbed[0]?.tipo : rolEmbed?.tipo;
            setPerfil({
                id: data.id,
                nombre: data.nombre,
                apellido: data.apellido,
                nombreCompleto: `${data.nombre} ${data.apellido}`.trim(),
                iniciales: inicialesDe(data.nombre, data.apellido),
                dni: data.dni,
                email: data.email,
                rol: labelRol(tipo),
                estado: data.estado === "activo" ? "Activo" : "Inactivo",
                esAdministrador: tipo === "Administrador",
                esVistaDescarga: tipo === "Vista_Descarga" || tipo === "Vista_Consulta",
                esResponsableDeposito: tipo === "Responsable_Deposito",
            });
            setLoading(false);
        }
        void load();
        const { data: { subscription }, } = supabase.auth.onAuthStateChange(() => {
            void load();
        });
        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);
    return { perfil, loading };
}
