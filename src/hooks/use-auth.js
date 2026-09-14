import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function useAuth() {
    const [state, setState] = useState({ user: null, loading: true, registrado: true });

    useEffect(() => {
        if (!getSupabaseEnv().isConfigured) {
            setState({ user: null, loading: false, registrado: true });
            return;
        }
        const supabase = createBrowserClient();
        let cancelled = false;

        async function clearBrokenSession() {
            try {
                await supabase.auth.signOut({ scope: "local" });
            } catch {
                /* el token ya está vencido o no existe */
            }
        }

        async function resolve(user) {
            if (cancelled) return;
            if (!user) {
                setState({ user: null, loading: false, registrado: true });
                return;
            }
            const { data } = await supabase
                .from("responsables")
                .select("id")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            if (cancelled) return;
            setState({
                user,
                loading: false,
                registrado: Boolean(data),
            });
        }

        async function boot() {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    await clearBrokenSession();
                    await resolve(null);
                    return;
                }
                await resolve(data.session?.user ?? null);
            } catch {
                await clearBrokenSession();
                if (!cancelled) setState({ user: null, loading: false, registrado: true });
            }
        }

        void boot();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "TOKEN_REFRESHED" && !session) {
                void resolve(null);
                return;
            }
            void resolve(session?.user ?? null);
        });
        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    return state;
}
