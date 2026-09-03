import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Mail, Search } from "lucide-react";
import { AuthCard, AuthDivider, AuthPrompt } from "@/components/layout/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/app/layouts/ToastProvider";
import { sendRecuperarContrasena } from "@/lib/emailjs";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
    buscarRecuperacion,
    confirmarRecuperacion,
    explainRecuperarError,
    solicitarRecuperacion,
} from "@/services/recuperar";
import { APP_ROUTES } from "@/utils/routes";
import { digitsOnly, isValidEmail, isValidPassword, passwordsMatch } from "@/utils/validators";

export default function RecuperarPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { notify } = useToast();
    const { isConfigured } = getSupabaseEnv();
    const token = searchParams.get("token") ?? "";
    const [dni, setDni] = useState(digitsOnly(searchParams.get("dni")));
    const [email, setEmail] = useState("");
    const [emailOriginal, setEmailOriginal] = useState("");
    const [nombre, setNombre] = useState("");
    const [encontrado, setEncontrado] = useState(false);
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(false);
    const emailChanged = encontrado && email.trim().toLowerCase() !== emailOriginal.trim().toLowerCase();

    function resetBusqueda() {
        setEncontrado(false);
        setEmail("");
        setEmailOriginal("");
        setNombre("");
        setError(null);
    }

    async function handleBuscar(event) {
        event.preventDefault();
        setError(null);
        if (!digitsOnly(dni)) {
            setError("Completá el DNI.");
            return;
        }
        setPending(true);
        try {
            const result = await buscarRecuperacion(digitsOnly(dni));
            setDni(result.dni ?? digitsOnly(dni));
            setEmail(result.email ?? "");
            setEmailOriginal(result.email ?? "");
            setNombre(result.nombre ?? "");
            setEncontrado(true);
        }
        catch (err) {
            resetBusqueda();
            setError(explainRecuperarError(err));
        }
        finally {
            setPending(false);
        }
    }

    async function handleEnviar(event) {
        event.preventDefault();
        setError(null);
        if (!isValidEmail(email)) {
            setError("Ingresá un email válido.");
            return;
        }
        setPending(true);
        try {
            const result = await solicitarRecuperacion(digitsOnly(dni), email.trim());
            const link = `${window.location.origin}${APP_ROUTES.recuperar}?token=${encodeURIComponent(result.token)}&dni=${encodeURIComponent(result.dni ?? dni)}`;
            await sendRecuperarContrasena({
                email: result.email,
                nombre: result.nombre ?? nombre,
                dni: result.dni ?? dni,
                link,
            });
            if (result.email_changed) {
                notify(`Actualizamos el mail y te enviamos el enlace a ${result.email}.`, "success");
            }
            else {
                notify(`Te enviamos el enlace a ${result.email}.`, "success");
            }
        }
        catch (err) {
            setError(explainRecuperarError(err));
        }
        finally {
            setPending(false);
        }
    }

    async function handleGuardar(event) {
        event.preventDefault();
        setError(null);
        if (!isValidPassword(password)) {
            setError("La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.");
            return;
        }
        if (!passwordsMatch(password, password2)) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        setPending(true);
        try {
            const result = await confirmarRecuperacion(token, password);
            notify("Contraseña actualizada. Ingresá con tu DNI.", "success");
            navigate(`${APP_ROUTES.login}?dni=${encodeURIComponent(result.dni ?? dni)}`, { replace: true });
        }
        catch (err) {
            setError(explainRecuperarError(err));
        }
        finally {
            setPending(false);
        }
    }

    if (token) {
        return (
            <AuthCard
                title="Recuperar contraseña"
                description="Cargá la contraseña nueva dos veces. Después ingresás con tu DNI."
            >
                <form className="space-y-3" onSubmit={handleGuardar}>
                    {!isConfigured ? <Alert>Faltan las claves de Supabase en el .env.</Alert> : null}
                    {error ? <Alert>{error}</Alert> : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                        label="Nueva contraseña"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        hint={<span className="text-xs text-app-mutedtext">Mínimo 8 caracteres, una mayúscula y un número.</span>}
                    />
                    <Input
                        label="Repetir contraseña"
                        type="password"
                        value={password2}
                        onChange={(event) => setPassword2(event.target.value)}
                        required
                    />
                    </div>
                    <Button type="submit" className="w-full" disabled={pending || !isConfigured}>
                        {pending ? <Spinner className="h-4 w-4 text-white" /> : <KeyRound size={16} strokeWidth={1.6} />}
                        {pending ? "Guardando…" : "Guardar"}
                    </Button>
                    <div className="space-y-3 pt-1">
                        <AuthDivider />
                        <AuthPrompt
                            question="¿Ya tenés una cuenta?"
                            to={APP_ROUTES.login}
                            action="Iniciá sesión"
                        />
                    </div>
                </form>
            </AuthCard>
        );
    }

    return (
        <AuthCard
            title="Recuperar contraseña"
            description={
                encontrado
                    ? "Confirmá el mail. Si está mal, cambialo y lo actualizamos antes de enviar el enlace."
                    : "Ingresá tu DNI para buscar tu usuario."
            }
        >
            <form className="space-y-3" onSubmit={encontrado ? handleEnviar : handleBuscar}>
                {!isConfigured ? <Alert>Faltan las claves de Supabase en el .env.</Alert> : null}
                {error ? <Alert>{error}</Alert> : null}
                <div className={encontrado ? "grid gap-3 sm:grid-cols-2" : ""}>
                <Input
                    label="DNI"
                    inputMode="numeric"
                    value={dni}
                    onChange={(event) => {
                        setDni(digitsOnly(event.target.value));
                        if (encontrado) resetBusqueda();
                    }}
                    required
                    disabled={encontrado}
                />
                {encontrado ? (
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        hint={
                            <span className="text-xs text-app-mutedtext">
                                {emailChanged
                                    ? "Vas a actualizar este mail en la cuenta y después te enviamos el enlace."
                                    : "Si está mal, cambialo. Si está bien, te enviamos el enlace a este mail."}
                            </span>
                        }
                    />
                ) : null}
                </div>
                <Button type="submit" className="w-full" disabled={pending || !isConfigured}>
                    {pending ? (
                        <Spinner className="h-4 w-4 text-white" />
                    ) : encontrado ? (
                        <Mail size={16} strokeWidth={1.6} />
                    ) : (
                        <Search size={16} strokeWidth={1.6} />
                    )}
                    {pending
                        ? (encontrado ? "Enviando…" : "Buscando…")
                        : (encontrado ? "Enviar mail" : "Buscar usuario")}
                </Button>
                {encontrado ? (
                    <button
                        type="button"
                        className="w-full text-center text-[13px] font-medium text-app-mutedtext underline hover:text-app-primary"
                        onClick={resetBusqueda}
                    >
                        Buscar otro DNI
                    </button>
                ) : null}
                <div className="space-y-3 pt-1">
                    <AuthDivider />
                    <AuthPrompt
                        question="¿Ya tenés una cuenta?"
                        to={APP_ROUTES.login}
                        action="Iniciá sesión"
                    />
                </div>
            </form>
        </AuthCard>
    );
}
