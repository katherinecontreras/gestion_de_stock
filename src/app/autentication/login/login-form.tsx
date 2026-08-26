"use client";

import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserClient } from "@/lib/supabase";
import { APP_ROUTES } from "@/utils/routes";

export function LoginForm({ configured = true }: { configured?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const redirectTo = searchParams.get("redirectTo") ?? APP_ROUTES.articulos;
  const nextPath = redirectTo.startsWith("/pages/")
    ? redirectTo
    : APP_ROUTES.articulos;

  async function signIn(form: HTMLFormElement) {
    setError(null);
    setPending(true);

    const formData = new FormData(form);
    const dni = String(formData.get("dni") ?? "").replace(/\D/g, "");
    const password = String(formData.get("password") ?? "");

    if (!dni || !password) {
      setError("Completá DNI y contraseña.");
      setPending(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { data: email, error: rpcError } = await supabase.rpc(
        "rpc_email_por_dni",
        { p_dni: dni },
      );

      if (rpcError) {
        setError(
          /fetch failed/i.test(rpcError.message)
            ? "No se pudo conectar con Supabase. Recargá la página e intentá de nuevo."
            : `No se pudo validar el DNI. (${rpcError.code ?? "sin código"}: ${rpcError.message})`,
        );
        return;
      }

      if (!email) {
        setError(
          `El DNI ${dni} no está registrado o el responsable está inactivo. El alta de Katherine usa 960508223.`,
        );
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("DNI o contraseña incorrectos.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión. Recargá la página e intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(event.currentTarget);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!configured ? (
        <Alert>
          Faltan las claves reales de Supabase en el archivo .env. Pegá Project
          URL y la anon key (o publishable) de gestion_de_stock y reiniciá npm
          run dev.
        </Alert>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      <Input
        name="dni"
        label="DNI"
        autoComplete="username"
        inputMode="numeric"
        placeholder="960508223"
        required
      />
      <Input
        name="password"
        type="password"
        label="Contraseña"
        autoComplete="current-password"
        required
      />
      <Button type="submit" className="mt-1 w-full" disabled={pending || !configured}>
        {pending ? (
          <Spinner className="h-4 w-4 text-white" />
        ) : (
          <LogIn size={16} strokeWidth={1.6} />
        )}
        {pending ? "Ingresando…" : "Ingresar"}
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
  );
}
