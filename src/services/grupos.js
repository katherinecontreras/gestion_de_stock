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
export function prefijoCodigoGrupo(familiaCodigo) {
    return String(familiaCodigo ?? "").trim();
}
export function sufijoCodigoGrupo(codigo, familiaCodigo) {
    const prefix = prefijoCodigoGrupo(familiaCodigo);
    const value = String(codigo ?? "").trim();
    if (prefix && value.toLowerCase().startsWith(prefix.toLowerCase())) {
        return value.slice(prefix.length);
    }
    return value;
}
export function codigoGrupoCompleto(familiaCodigo, sufijo) {
    const prefix = prefijoCodigoGrupo(familiaCodigo);
    const rest = sufijoCodigoGrupo(sufijo, prefix);
    return `${prefix}${rest}`;
}
export function explainGrupoError(errorOrMessage, code) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    const resolvedCode = code ?? errorOrMessage?.code;
    if (resolvedCode === "23505") {
        return "Ya existe un grupo con ese código en esta familia.";
    }
    if (resolvedCode === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para gestionar grupos.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar la operación.");
}
export async function getFamiliaDetalle(id) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("familias")
        .select("id, codigo, descripcion, estado")
        .eq("id", id)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
export async function listGruposResumen(idFamilia) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("v_grupos_resumen")
        .select("id, id_familia, codigo, descripcion, estado, cant_articulos, costo_total")
        .eq("id_familia", idFamilia)
        .order("codigo", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
}
export async function listGrupoCodigos(idFamilia) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("grupos")
        .select("id, codigo, descripcion, estado")
        .eq("id_familia", idFamilia)
        .order("codigo", { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
}
export async function createGrupo(idFamilia, input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data, error } = await supabase
        .from("grupos")
        .insert({
        id_familia: idFamilia,
        codigo: payload.codigo,
        descripcion: payload.descripcion,
        estado: "activo",
    })
        .select("id, id_familia, codigo, descripcion, estado")
        .single();
    if (error)
        throw error;
    return data;
}
export async function updateGrupo(id, input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data: previa, error: previaError } = await supabase
        .from("grupos")
        .select("estado")
        .eq("id", id)
        .maybeSingle();
    if (previaError)
        throw previaError;
    const { data, error } = await supabase
        .from("grupos")
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
            tabla: "grupos",
            id,
            codigo: payload.codigo,
            descripcion: payload.descripcion,
            estado: payload.estado,
        });
    }
    return data;
}
export async function eliminarGrupo(id) {
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc("rpc_eliminar_grupo", {
        p_grupo: id,
    });
    if (error)
        throw error;
}
export async function listArticulosAsignacion() {
    const supabase = createBrowserClient();
    const [{ data: articulos, error: articulosError }, { data: inventario, error: inventarioError }] = await Promise.all([
        supabase
            .from("v_articulos_costo_actual")
            .select("id, codigo, nombre, unidad_de_medida, grupo_codigo, familia_codigo, id_grupo")
            .eq("estado", "activo")
            .order("codigo", { ascending: true }),
        supabase
            .from("inventario_depositos")
            .select("id_articulo, cantidad_actual, depositos ( nombre )")
            .gt("cantidad_actual", 0),
    ]);
    if (articulosError)
        throw articulosError;
    if (inventarioError)
        throw inventarioError;
    const depositosByArticulo = new Map();
    for (const row of (inventario ?? [])) {
        const deposito = Array.isArray(row.depositos) ? row.depositos[0] : row.depositos;
        const nombre = deposito?.nombre?.trim();
        if (!nombre)
            continue;
        const list = depositosByArticulo.get(row.id_articulo) ?? [];
        if (!list.includes(nombre))
            list.push(nombre);
        depositosByArticulo.set(row.id_articulo, list);
    }
    return (articulos ?? []).map((row) => ({
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        unidad: row.unidad_de_medida,
        familiaCodigo: row.familia_codigo,
        grupoCodigo: row.grupo_codigo,
        idGrupo: row.id_grupo,
        depositos: (depositosByArticulo.get(row.id) ?? []).join(", ") || "—",
    }));
}
export async function asignarArticulosGrupo(idGrupo, idsArticulos) {
    const supabase = createBrowserClient();
    const { data: inactivos, error: inactivosError } = await supabase
        .from("articulos")
        .select("id")
        .eq("id_grupo", idGrupo)
        .eq("estado", "inactivo");
    if (inactivosError)
        throw inactivosError;
    const ids = [...new Set([...idsArticulos, ...(inactivos ?? []).map((row) => row.id)])];
    const { data, error } = await supabase.rpc("rpc_asignar_articulos_grupo", {
        p_grupo: idGrupo,
        p_articulos: ids,
    });
    if (error)
        throw error;
    return (data ?? {});
}
