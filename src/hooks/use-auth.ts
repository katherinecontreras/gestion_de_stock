"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase/env";

type AuthState = {
  user: User | null;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    if (!getSupabaseEnv().isConfigured) {
      setState({ user: null, loading: false });
      return;
    }

    const supabase = createBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setState({ user: data.user, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
