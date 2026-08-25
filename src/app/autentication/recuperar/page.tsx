import { KeyRound } from "lucide-react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RecuperarPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Cargá una contraseña nueva y repetila para confirmar."
    >
      <form className="space-y-3">
        <Input name="password" type="password" label="Nueva contraseña" />
        <Input
          name="password_confirm"
          type="password"
          label="Repetir contraseña"
        />
        <Button type="button" className="w-full" disabled>
          <KeyRound size={16} strokeWidth={1.6} />
          Guardar
        </Button>
      </form>
    </AuthCard>
  );
}
