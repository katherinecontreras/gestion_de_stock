import { createBrowserClient } from "@/lib/supabase";
import { errorText, explainMissingDbFunction } from "./db-errors";
import { notificarCambioEstadoFamiliaGrupo } from "./notificaciones";
function normalizeInput(input) {
    return {
        codigo: input.codigo.trim(),
        descripcion: input.descripcion.trim(),
        estado: input.estado === "inactivo" ? "inactivo" : "activo",
    };
}
export function nextFamiliaCodigo(codigos) {
    let max = -1;
    for (const codigo of codigos) {
        const value = codigo.trim();
        if (!/^\d+$/.test(value))
            continue;
        max = Math.max(max, Number(value));
    }
    return String(max + 1).padStart(3, "0");
}
export function nextCodigoDesdeActivos(rows) {
    return nextFamiliaCodigo((rows ?? [])
        .filter((row) => row.estado === "activo")
        .map((row) => row.codigo));
}
export function explainFamiliaError(errorOrMessage, code) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    const resolvedCode = code ?? errorOrMessage?.code;
    if (resolvedCode === "23505") {
        return "Ya existe una familia con ese código.";
    }
    if (resolvedCode === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para gestionar familias.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar la operación.");
}
export async function listFamiliasResumen() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("v_familias_resumen")
        .select("id, codigo, descripcion, estado, cant_grupos, cant_articulos, costo_total")
        .order("codigo", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
}
export async function listFamiliasCodigos() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("familias")
        .select("id, codigo, descripcion, estado")
        .order("codigo", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
}
export async function listFamiliasConGrupos(ids) {
    if (ids.length === 0)
        return [];
    const supabase = createBrowserClient();
    const { data: familias, error: familiasError } = await supabase
        .from("familias")
        .select("id, codigo, descripcion, estado")
        .in("id", ids)
        .order("codigo", { ascending: true });
    if (familiasError)
        throw familiasError;
    const { data: grupos, error: gruposError } = await supabase
        .from("grupos")
        .select("id_familia, codigo, descripcion")
        .in("id_familia", ids)
        .order("codigo", { ascending: true });
    if (gruposError)
        throw gruposError;
    const byFamilia = new Map();
    for (const grupo of grupos ?? []) {
        const list = byFamilia.get(grupo.id_familia) ?? [];
        list.push({ codigo: grupo.codigo, descripcion: grupo.descripcion });
        byFamilia.set(grupo.id_familia, list);
    }
    return (familias ?? []).map((familia) => ({
        id: familia.id,
        codigo: familia.codigo,
        descripcion: familia.descripcion,
        grupos: byFamilia.get(familia.id) ?? [],
    }));
}
export async function createFamilia(input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data, error } = await supabase
        .from("familias")
        .insert({
        codigo: payload.codigo,
        descripcion: payload.descripcion,
        estado: "activo",
    })
        .select("id, codigo, descripcion, estado, created_at, updated_at")
        .single();
    if (error)
        throw error;
    return data;
}
export async function updateFamilia(id, input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data: previa, error: previaError } = await supabase
        .from("familias")
        .select("estado")
        .eq("id", id)
        .maybeSingle();
    if (previaError)
        throw previaError;
    const { data, error } = await supabase
        .from("familias")
        .update({
        codigo: payload.codigo,
        descripcion: payload.descripcion,
        estado: payload.estado,
    })
        .eq("id", id)
        .select("id, codigo, descripcion, estado")
        .single();
    if (error)
        throw error;
    if (previa?.estado && previa.estado !== payload.estado) {
        await notificarCambioEstadoFamiliaGrupo({
            tabla: "familias",
            id,
            codigo: payload.codigo,
            descripcion: payload.descripcion,
            estado: payload.estado,
        });
    }
    return data;
}
export async function upsertGrupos(inputs) {
    const supabase = createBrowserClient();
    const payloads = inputs.map((input) => ({
        id_familia: input.id_familia,
        codigo: input.codigo.trim(),
        descripcion: input.descripcion.trim(),
        estado: "activo",
    }));
    const { data, error } = await supabase.rpc("rpc_upsert_grupos_masivo", {
        p_filas: payloads,
    });
    if (error)
        throw error;
    const result = (data ?? {});
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
export async function eliminarFamilia(id) {
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc("rpc_eliminar_familia", {
        p_familia: id,
    });
    if (error)
        throw error;
}
