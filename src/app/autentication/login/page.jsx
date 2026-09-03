import { AuthCard } from "@/components/layout/auth-card";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const { isConfigured } = getSupabaseEnv();

  return (
    <AuthCard
      title="Ingresar"
      description="Completá DNI y contraseña para ingresar."
    >
      <LoginForm configured={isConfigured} />
    </AuthCard>
  );
}
