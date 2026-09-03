import { createBrowserClient } from "@/lib/supabase";
import { errorText } from "./db-errors";

export function explainRecuperarError(errorOrMessage) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    if (/PGRST202|Could not find the function|rpc_buscar_recuperacion|rpc_solicitar_recuperacion|rpc_confirmar_recuperacion|tokens_recuperacion/i.test(message)
        || /42883/.test(message)) {
        return "Falta el SQL de recuperar contraseña en la base. Pegá el ajuste del chat y reintentá.";
    }
    return message || "No se pudo completar la recuperación.";
}

export async function buscarRecuperacion(dni) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_buscar_recuperacion", {
        p_dni: dni,
    });
    if (error)
        throw error;
    return data;
}

export async function solicitarRecuperacion(dni, email) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_solicitar_recuperacion", {
        p_dni: dni,
        p_email: email,
    });
    if (error)
        throw error;
    return data;
}

export async function confirmarRecuperacion(token, password) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_confirmar_recuperacion", {
        p_token: token,
        p_password: password,
    });
    if (error)
        throw error;
    return data;
}
