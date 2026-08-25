import { UserPlus } from "lucide-react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegistroPage() {
  return (
    <AuthCard
      title="Registro"
      description="Revisá tus datos y definí una contraseña (mínimo 8 caracteres, una mayúscula y un número)."
    >
      <form className="space-y-3">
        <Input name="nombre" label="Nombre" />
        <Input name="apellido" label="Apellido" />
        <Input name="dni" label="DNI" />
        <Input name="email" type="email" label="Email" />
        <Input name="password" type="password" label="Contraseña" />
        <Input
          name="password_confirm"
          type="password"
          label="Repetir contraseña"
        />
        <Button type="button" className="w-full" disabled>
          <UserPlus size={16} strokeWidth={1.6} />
          Registrar
        </Button>
      </form>
    </AuthCard>
  );
}
