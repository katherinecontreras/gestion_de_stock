import { createBrowserClient } from "@/lib/supabase";
import { errorText } from "./db-errors";

export function explainRegistroError(errorOrMessage) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    if (/already registered|already been registered|user already/i.test(message)) {
        return "Ese email ya tiene un usuario. Si no terminaste el registro, completá el código o usá otro email.";
    }
    if (/confirmation email|error sending confirmation|Error sending confirmation/i.test(message)) {
        return "Supabase no pudo enviar su mail de confirmación. El código lo mandamos nosotros: en Authentication → Providers → Email desactivá «Confirm email» y reintentá.";
    }
    if (/signups not allowed|signup is disabled|Email signups are disabled/i.test(message)) {
        return "El alta de usuarios está deshabilitada en Auth. Activá Email signup en el proyecto de stock.";
    }
    if (/column .*registrado|record \".*\" has no field \"registrado\"/i.test(message)) {
        return "Falta la columna de registro en responsables. Pegá el SQL de registro del chat y reintentá.";
    }
    if (/PGRST202|Could not find the function|rpc_depositos_activos_registro|rpc_iniciar_registro|rpc_vincular_auth_registro|rpc_reenviar_codigo_registro|rpc_cambiar_email_registro|rpc_confirmar_codigo_registro|42883/i.test(message)) {
        return "Falta el SQL de registro en la base. Pegá el ajuste del chat y recargá.";
    }
    if (/row-level security|permission denied/i.test(message)) {
        return "No se pudo completar el registro. Pegá el SQL de registro en Supabase y reintentá.";
    }
    return message || "No se pudo completar el registro.";
}

export async function listDepositosActivosRegistro() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_depositos_activos_registro", {});
    if (error)
        throw error;
    return data ?? [];
}

export async function iniciarRegistro(payload) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_iniciar_registro", {
        p_nombre: payload.nombre,
        p_apellido: payload.apellido,
        p_dni: payload.dni,
        p_email: payload.email,
        p_rol: payload.rol,
        p_depositos: payload.depositos,
    });
    if (error)
        throw error;
    return data;
}

export async function vincularAuthRegistro(token) {
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc("rpc_vincular_auth_registro", {
        p_token: token,
    });
    if (error)
        throw error;
}

export async function reenviarCodigoRegistro(token) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_reenviar_codigo_registro", {
        p_token: token,
    });
    if (error)
        throw error;
    return data;
}

export async function cambiarEmailRegistro(token, email) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_cambiar_email_registro", {
        p_token: token,
        p_email: email,
    });
    if (error)
        throw error;
    return data;
}

export async function confirmarCodigoRegistro(token, codigo) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_confirmar_codigo_registro", {
        p_token: token,
        p_codigo: codigo,
    });
    if (error)
        throw error;
    return data;
}
