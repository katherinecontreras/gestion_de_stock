import Link from "next/link";
import { LogIn } from "lucide-react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/utils/routes";

export default function LoginPage() {
  return (
    <AuthCard
      title="Ingresar"
      description="Completá DNI y contraseña para acceder."
    >
      <form className="space-y-3">
        <Input name="dni" label="DNI" autoComplete="username" required />
        <Input
          name="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          required
        />
        <Button type="button" className="mt-1 w-full" disabled>
          <LogIn size={16} strokeWidth={1.6} />
          Ingresar
        </Button>
        <p className="pt-1 text-center">
          <Link
            className="text-[13px] font-medium text-app-mutedtext underline transition-colors duration-hover hover:text-app-primary"
            href={APP_ROUTES.recuperar}
          >
            Recuperar contraseña
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
