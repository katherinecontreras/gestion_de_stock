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

        async function resolve(user) {
            if (!user) {
                setState({ user: null, loading: false, registrado: true });
                return;
            }
            const { data } = await supabase
                .from("responsables")
                .select("id")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            setState({
                user,
                loading: false,
                registrado: Boolean(data),
            });
        }

        supabase.auth.getUser().then(({ data }) => {
            void resolve(data.user);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            void resolve(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    return state;
}
