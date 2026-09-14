import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { LogIn } from "lucide-react";
import { AuthDivider, AuthPrompt } from "@/components/layout/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserClient } from "@/lib/supabase";
import { staggerContainer, staggerItem } from "@/utils/motion";
import { APP_ROUTES, toAppEntry } from "@/utils/routes";
import { digitsOnly } from "@/utils/validators";

export function LoginForm({ configured = true }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [dni, setDni] = useState(digitsOnly(searchParams.get("dni")));
  const redirectTo = searchParams.get("redirectTo") ?? APP_ROUTES.dashboard;
  const nextPath = toAppEntry(redirectTo);

  async function signIn(form) {
    setError(null);
    setPending(true);

    const formData = new FormData(form);
    const dniValue = digitsOnly(formData.get("dni"));
    const password = String(formData.get("password") ?? "");

    if (!dniValue || !password) {
      setError("Completá DNI y contraseña.");
      setPending(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { data: email, error: rpcError } = await supabase.rpc(
        "rpc_email_por_dni",
        { p_dni: dniValue },
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
          "El DNI no está registrado, el usuario está inactivo o todavía no confirmaste el código de ingreso.",
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

      navigate(nextPath, { replace: true });
    } catch {
      setError("No se pudo iniciar sesión. Recargá la página e intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void signIn(event.currentTarget);
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-3"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {!configured ? (
        <motion.div variants={staggerItem}>
          <Alert>
            Faltan las claves de Supabase. En local completalas en el archivo
            .env. En Vercel tienen que estar en el build de producción.
          </Alert>
        </motion.div>
      ) : null}
      {error ? (
        <motion.div variants={staggerItem}>
          <Alert>{error}</Alert>
        </motion.div>
      ) : null}
      <motion.div variants={staggerItem}>
        <Input
          name="dni"
          label="DNI"
          autoComplete="username"
          inputMode="numeric"
          value={dni}
          onChange={(event) => setDni(digitsOnly(event.target.value))}
          required
        />
      </motion.div>
      <motion.div variants={staggerItem}>
        <Input
          name="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          required
        />
      </motion.div>
      <motion.div variants={staggerItem}>
        <Button type="submit" className="mt-1 w-full" disabled={pending || !configured}>
          {pending ? (
            <Spinner className="h-4 w-4 text-white" />
          ) : (
            <LogIn size={16} strokeWidth={1.6} />
          )}
          {pending ? "Ingresando…" : "Ingresar"}
        </Button>
      </motion.div>
      <motion.div className="space-y-3 pt-1" variants={staggerItem}>
        <AuthPrompt
          question="¿Olvidaste tu contraseña?"
          to={APP_ROUTES.recuperar}
          action="Recuperar contraseña"
        />
        <AuthDivider />
        <AuthPrompt
          question="¿No tenés una cuenta?"
          to={APP_ROUTES.registro}
          action="Registrate"
        />
      </motion.div>
    </motion.form>
  );
}
