import { useEffect, useRef } from "react";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { procesarAlertasRecambio } from "@/services/alertas-recambio";

export function useAlertasRecambio(enabled) {
    const ran = useRef(false);

    useEffect(() => {
        if (!enabled || !getSupabaseEnv().isConfigured || ran.current) return;
        ran.current = true;
        void procesarAlertasRecambio().catch(() => {
            ran.current = false;
        });
    }, [enabled]);
}
