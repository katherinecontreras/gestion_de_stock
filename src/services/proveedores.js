import { createBrowserClient } from "@/lib/supabase";
import { nextFamiliaCodigo } from "./familias";
import { errorText, explainMissingDbFunction } from "./db-errors";
import { notificarCambioEstadoFamiliaGrupo } from "./notificaciones";

function normalizeInput(input) {
    return {
        cod_proveedor: input.cod_proveedor.trim(),
        razon_social: input.razon_social.trim(),
        estado: input.estado === "inactivo" ? "inactivo" : "activo",
    };
}

export function nextProveedorCodigoDesdeActivos(rows) {
    return nextFamiliaCodigo((rows ?? [])
        .filter((row) => row.estado === "activo")
        .map((row) => row.cod_proveedor));
}

export function explainProveedorError(errorOrMessage, code) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    const resolvedCode = code ?? errorOrMessage?.code;
    if (resolvedCode === "23505") {
        return "Ya existe un proveedor con ese código.";
    }
    if (resolvedCode === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para gestionar proveedores.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar la operación.");
}

export async function listProveedores() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("proveedores")
        .select("id, cod_proveedor, razon_social, estado, created_at, updated_at")
        .order("cod_proveedor", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}

export async function listProveedoresActivos() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("proveedores")
        .select("id, cod_proveedor, razon_social, estado, created_at, updated_at")
        .eq("estado", "activo")
        .order("razon_social", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}

export async function createProveedor(input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data, error } = await supabase
        .from("proveedores")
        .insert({
            cod_proveedor: payload.cod_proveedor,
            razon_social: payload.razon_social,
            estado: "activo",
        })
        .select("id, cod_proveedor, razon_social, estado, created_at, updated_at")
        .single();
    if (error)
        throw error;
    return data;
}

export async function updateProveedor(id, input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data: previa, error: previaError } = await supabase
        .from("proveedores")
        .select("estado")
        .eq("id", id)
        .maybeSingle();
    if (previaError)
        throw previaError;
    const { data, error } = await supabase
        .from("proveedores")
        .update({
            cod_proveedor: payload.cod_proveedor,
            razon_social: payload.razon_social,
            estado: payload.estado,
        })
        .eq("id", id)
        .select("id, cod_proveedor, razon_social, estado, created_at, updated_at")
        .single();
    if (error)
        throw error;
    if (previa?.estado && previa.estado !== payload.estado) {
        await notificarCambioEstadoFamiliaGrupo({
            tabla: "proveedores",
            id,
            codigo: payload.cod_proveedor,
            descripcion: payload.razon_social,
            estado: payload.estado,
        });
    }
    return data;
}

export async function upsertProveedores(inputs) {
    const supabase = createBrowserClient();
    const payloads = inputs.map((input) => ({
        ...normalizeInput(input),
    }));
    const { data, error } = await supabase.rpc("rpc_upsert_proveedores_masivo", {
        p_filas: payloads,
    });
    if (error)
        throw error;
    const result = data ?? {};
    const created = Number(result.created ?? 0);
    const updated = Number(result.updated ?? 0);
    const unchanged = Number(result.unchanged ?? 0);
    return {
        total: Number(result.total ?? created + updated + unchanged),
        updated,
        created,
        unchanged,
    };
}

export async function eliminarProveedor(id) {
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc("rpc_eliminar_proveedor", {
        p_proveedor: id,
    });
    if (error)
        throw error;
}
