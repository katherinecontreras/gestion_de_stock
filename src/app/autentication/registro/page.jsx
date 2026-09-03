import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Search, UserPlus } from "lucide-react";
import { AuthCard, AuthDivider, AuthPrompt } from "@/components/layout/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternalCode } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/app/layouts/ToastProvider";
import { sendCodigoIngreso } from "@/lib/emailjs";
import { createBrowserClient } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
    cambiarEmailRegistro,
    confirmarCodigoRegistro,
    explainRegistroError,
    iniciarRegistro,
    listDepositosActivosRegistro,
    reenviarCodigoRegistro,
    vincularAuthRegistro,
} from "@/services/registro";
import { APP_ROUTES } from "@/utils/routes";
import { digitsOnly, isValidEmail, isValidPassword, passwordsMatch } from "@/utils/validators";

const SELECT_CLASS = "w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus";
const STORAGE_KEY = "gs_registro_pendiente";

function readPending() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}

function writePending(value) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function clearPending() {
    sessionStorage.removeItem(STORAGE_KEY);
}

function CodeInputs({ value, onChange, disabled }) {
    const refs = useRef([]);

    function setDigit(index, digit) {
        const next = value.split("");
        next[index] = digit;
        onChange(next.join("").slice(0, 6));
    }

    function handleChange(index, raw) {
        const digit = raw.replace(/\D/g, "").slice(-1);
        if (!digit) {
            setDigit(index, "");
            return;
        }
        setDigit(index, digit);
        refs.current[index + 1]?.focus();
    }

    function handleKeyDown(index, event) {
        if (event.key === "Backspace" && !value[index] && index > 0) {
            refs.current[index - 1]?.focus();
        }
    }

    function handlePaste(event) {
        const text = digitsOnly(event.clipboardData.getData("text")).slice(0, 6);
        if (!text)
            return;
        event.preventDefault();
        onChange(text.padEnd(6, "").slice(0, 6));
        refs.current[Math.min(text.length, 5)]?.focus();
    }

    return (
        <div className="mx-auto flex w-full max-w-md justify-center gap-1.5 sm:gap-3" onPaste={handlePaste}>
            {Array.from({ length: 6 }, (_, index) => (
                <input
                    key={index}
                    ref={(node) => { refs.current[index] = node; }}
                    inputMode="numeric"
                    maxLength={1}
                    disabled={disabled}
                    value={value[index] ?? ""}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    className="h-12 min-w-0 flex-1 rounded-control border border-app-input bg-app-surface text-center font-mono text-lg text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                    aria-label={`Dígito ${index + 1}`}
                />
            ))}
        </div>
    );
}

export default function RegistroPage() {
    const navigate = useNavigate();
    const { notify } = useToast();
    const { isConfigured } = getSupabaseEnv();
    const [step, setStep] = useState("form");
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [email, setEmail] = useState("");
    const [dni, setDni] = useState("");
    const [rol, setRol] = useState("Responsable_Deposito");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [depositos, setDepositos] = useState([]);
    const [depositosError, setDepositosError] = useState(null);
    const [depositosLoading, setDepositosLoading] = useState(true);
    const [selected, setSelected] = useState(() => new Set());
    const [depSearch, setDepSearch] = useState("");
    const [token, setToken] = useState("");
    const [codigo, setCodigo] = useState("");
    const [mailEdit, setMailEdit] = useState(false);
    const [mailDraft, setMailDraft] = useState("");
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        const saved = readPending();
        if (saved?.token && saved?.email && saved?.dni) {
            setToken(saved.token);
            setEmail(saved.email);
            setDni(saved.dni);
            setNombre(saved.nombre ?? "");
            setStep("codigo");
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        setDepositosLoading(true);
        listDepositosActivosRegistro()
            .then((rows) => {
                if (cancelled)
                    return;
                setDepositos(rows);
                setDepositosError(null);
            })
            .catch((err) => {
                if (cancelled)
                    return;
                setDepositos([]);
                setDepositosError(explainRegistroError(err));
            })
            .finally(() => {
                if (!cancelled)
                    setDepositosLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const depositosVisibles = useMemo(() => {
        const term = depSearch.trim().toLowerCase();
        const list = term
            ? depositos.filter((row) => selected.has(row.id)
                || row.codigo.toLowerCase().includes(term)
                || row.nombre.toLowerCase().includes(term)
                || row.ubicacion.toLowerCase().includes(term))
            : depositos;
        return [...list].sort((a, b) => {
            const aSel = selected.has(a.id) ? 0 : 1;
            const bSel = selected.has(b.id) ? 0 : 1;
            if (aSel !== bSel)
                return aSel - bSel;
            return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
        });
    }, [depositos, depSearch, selected]);

    function toggleDeposito(id) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }

    async function afterCodigoEmitido(result, pass) {
        const supabase = createBrowserClient();
        const { error: signError } = await supabase.auth.signUp({
            email: result.email,
            password: pass,
        });
        if (signError && !/already/i.test(signError.message))
            throw signError;
        await vincularAuthRegistro(result.token);
        try {
            await sendCodigoIngreso({
                email: result.email,
                nombre: `${nombre.trim()} ${apellido.trim()}`.trim() || result.nombre,
                codigo: result.codigo,
                dni: result.dni,
            });
            notify("Te enviamos el código de ingreso al mail.", "success");
        }
        catch (mailError) {
            notify(explainRegistroError(mailError), "error");
        }
        await supabase.auth.signOut();
        writePending({
            token: result.token,
            email: result.email,
            dni: result.dni,
            nombre: result.nombre ?? nombre.trim(),
        });
        setToken(result.token);
        setEmail(result.email);
        setDni(result.dni);
        setCodigo("");
        setMailEdit(false);
        setMailDraft(result.email);
        setStep("codigo");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError(null);
        if (!isConfigured) {
            setError("Faltan las claves de Supabase en el .env.");
            return;
        }
        if (!nombre.trim() || !apellido.trim() || !digitsOnly(dni) || !email.trim()) {
            setError("Completá nombre, apellido, DNI y email.");
            return;
        }
        if (!isValidEmail(email)) {
            setError("Ingresá un email válido.");
            return;
        }
        if (!isValidPassword(password)) {
            setError("La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.");
            return;
        }
        if (!passwordsMatch(password, password2)) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (rol === "Responsable_Deposito" && selected.size < 1) {
            setError("Marcá al menos un depósito.");
            return;
        }
        setPending(true);
        try {
            const result = await iniciarRegistro({
                nombre,
                apellido,
                dni: digitsOnly(dni),
                email,
                rol,
                depositos: rol === "Responsable_Deposito" ? [...selected] : [],
            });
            await afterCodigoEmitido(result, password);
        }
        catch (err) {
            setError(explainRegistroError(err));
        }
        finally {
            setPending(false);
        }
    }

    async function handleConfirm(event) {
        event.preventDefault();
        setError(null);
        if (digitsOnly(codigo).length !== 6) {
            setError("Completá los 6 dígitos.");
            return;
        }
        setPending(true);
        try {
            const result = await confirmarCodigoRegistro(token, digitsOnly(codigo));
            clearPending();
            notify("Registro listo. Ingresá con tu DNI y contraseña.", "success");
            navigate(`${APP_ROUTES.login}?dni=${encodeURIComponent(result.dni ?? dni)}`, { replace: true });
        }
        catch (err) {
            setError(explainRegistroError(err));
        }
        finally {
            setPending(false);
        }
    }

    async function handleResend() {
        setError(null);
        setPending(true);
        try {
            const result = await reenviarCodigoRegistro(token);
            await sendCodigoIngreso({
                email: result.email,
                nombre: nombre.trim() || "usuario",
                codigo: result.codigo,
                dni,
            });
            writePending({
                token: result.token,
                email: result.email,
                dni,
                nombre,
            });
            setToken(result.token);
            setEmail(result.email);
            notify("Te enviamos un código nuevo.", "success");
        }
        catch (err) {
            setError(explainRegistroError(err));
        }
        finally {
            setPending(false);
        }
    }

    async function handleSaveEmail() {
        setError(null);
        if (!isValidEmail(mailDraft)) {
            setError("Ingresá un email válido.");
            return;
        }
        setPending(true);
        try {
            const result = await cambiarEmailRegistro(token, mailDraft);
            await sendCodigoIngreso({
                email: result.email,
                nombre: nombre.trim() || "usuario",
                codigo: result.codigo,
                dni,
            });
            writePending({
                token: result.token,
                email: result.email,
                dni,
                nombre,
            });
            setToken(result.token);
            setEmail(result.email);
            setMailEdit(false);
            notify("Email actualizado. Te enviamos el código al mail nuevo.", "success");
        }
        catch (err) {
            setError(explainRegistroError(err));
        }
        finally {
            setPending(false);
        }
    }

    if (step === "codigo") {
        return (
            <AuthCard
                title="Código de ingreso"
                description="Ingresá el código de 6 dígitos que te mandamos al mail. Después vas a entrar con DNI y contraseña."
            >
                <form className="space-y-4" onSubmit={handleConfirm}>
                    {error ? <Alert>{error}</Alert> : null}
                    <CodeInputs value={codigo} onChange={setCodigo} disabled={pending} />
                    {mailEdit ? (
                        <div className="space-y-2">
                            <Input
                                label="Email"
                                type="email"
                                value={mailDraft}
                                onChange={(event) => setMailDraft(event.target.value)}
                            />
                            <Button type="button" className="w-full" disabled={pending} onClick={() => void handleSaveEmail()}>
                                {pending ? <Spinner className="h-4 w-4 text-white" /> : null}
                                Guardar email y reenviar
                            </Button>
                        </div>
                    ) : (
                        <p className="text-center text-[13px] text-app-mutedtext">
                            Lo enviamos a <span className="font-medium text-app-primary">{email}</span>
                            {" · "}
                            <button
                                type="button"
                                className="font-medium underline hover:text-app-primary"
                                onClick={() => {
                                    setMailDraft(email);
                                    setMailEdit(true);
                                }}
                            >
                                Cambiar mail
                            </button>
                        </p>
                    )}
                    <Button type="submit" className="w-full" disabled={pending || digitsOnly(codigo).length !== 6}>
                        {pending ? <Spinner className="h-4 w-4 text-white" /> : null}
                        Confirmar código
                    </Button>
                    <Button type="button" variant="secondary" className="w-full" disabled={pending} onClick={() => void handleResend()}>
                        <Mail size={16} strokeWidth={1.6} />
                        Volver a enviar
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
            wide
            title="Registrarme"
            description="Completá tus datos. Después vas a ingresar con DNI y contraseña. No se puede elegir Administrador."
        >
            <form className="space-y-3" onSubmit={handleSubmit}>
                {!isConfigured ? (
                    <Alert>Faltan las claves de Supabase en el archivo .env.</Alert>
                ) : null}
                {error ? <Alert>{error}</Alert> : null}
                <div className="grid gap-3 md:grid-cols-2">
                    <Input label="Nombre" value={nombre} maxLength={120} onChange={(event) => setNombre(event.target.value)} required />
                    <Input label="Apellido" value={apellido} maxLength={120} onChange={(event) => setApellido(event.target.value)} required />
                    <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                    <Input
                        label="DNI"
                        inputMode="numeric"
                        value={dni}
                        onChange={(event) => setDni(digitsOnly(event.target.value))}
                        required
                    />
                    <label className="flex w-full flex-col gap-1.5 md:col-span-2">
                        <span className="text-sm font-medium text-app-secondarytext">Rol</span>
                        <select value={rol} onChange={(event) => setRol(event.target.value)} className={SELECT_CLASS}>
                            <option value="Responsable_Deposito">Responsable de depósito</option>
                            <option value="Vista_Descarga">Vista y descarga</option>
                        </select>
                    </label>
                    <Input
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        hint={<span className="text-xs text-app-mutedtext">Mínimo 8 caracteres, una mayúscula y un número. Entrá con DNI y esta contraseña.</span>}
                    />
                    <Input
                        label="Repetir contraseña"
                        type="password"
                        value={password2}
                        onChange={(event) => setPassword2(event.target.value)}
                        required
                    />
                </div>
                {rol === "Responsable_Deposito" ? (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-app-secondarytext">Depósitos a cargo (mínimo uno)</p>
                        <label className="relative block">
                            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                            <input
                                value={depSearch}
                                onChange={(event) => setDepSearch(event.target.value)}
                                placeholder="Buscar por código, nombre o ubicación"
                                className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                            />
                        </label>
                        <div className="max-h-56 overflow-auto rounded-xl border border-app-border-subtle md:max-h-80">
                            {depositosLoading ? (
                                <p className="flex items-center justify-center gap-2 px-4 py-6 text-center text-sm text-app-mutedtext">
                                    <Spinner className="h-4 w-4" />
                                    Cargando depósitos…
                                </p>
                            ) : depositosError ? (
                                <p className="px-4 py-6 text-center text-sm text-app-danger-text">{depositosError}</p>
                            ) : depositosVisibles.length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-app-mutedtext">
                                    No hay depósitos activos. Un administrador tiene que cargarlos en Depósitos.
                                </p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-app-muted text-app-mutedtext">
                                        <tr>
                                            <th className="w-10 px-3 py-2"><span className="sr-only">Seleccionar</span></th>
                                            <th className="px-3 py-2">Código</th>
                                            <th className="px-3 py-2">Nombre</th>
                                            <th className="px-3 py-2">Ubicación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {depositosVisibles.map((row) => (
                                            <tr key={row.id} className="border-t border-app-border-subtle hover:bg-app-subtle">
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.has(row.id)}
                                                        onChange={() => toggleDeposito(row.id)}
                                                        className="h-4 w-4 accent-app-accent"
                                                        aria-label={`Seleccionar ${row.nombre}`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2"><InternalCode>{row.codigo}</InternalCode></td>
                                                <td className="px-3 py-2 font-medium text-app-primary">{row.nombre}</td>
                                                <td className="px-3 py-2 text-app-secondarytext">{row.ubicacion}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="text-[13px] text-app-mutedtext">
                        Vista y descarga ve toda la información y puede descargar. No se le asignan depósitos.
                    </p>
                )}
                <Button type="submit" className="w-full" disabled={pending || !isConfigured}>
                    {pending ? <Spinner className="h-4 w-4 text-white" /> : <UserPlus size={16} strokeWidth={1.6} />}
                    {pending ? "Guardando…" : "Guardar y enviar código"}
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
