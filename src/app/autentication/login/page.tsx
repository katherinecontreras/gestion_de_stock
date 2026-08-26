import { Suspense } from "react";
import { AuthCard } from "@/components/layout/auth-card";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const { isConfigured } = getSupabaseEnv();

  return (
    <AuthCard
      title="Ingresar"
      description="Completá DNI y contraseña para acceder."
    >
      <Suspense>
        <LoginForm configured={isConfigured} />
      </Suspense>
    </AuthCard>
  );
}
