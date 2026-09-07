import { createBrowserClient } from "@/lib/supabase";
import { errorText, explainMissingDbFunction } from "./db-errors";

function embedOne(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function mapArticuloInventario(art) {
    if (!art) return null;
    const grupo = embedOne(art.grupos);
    const familia = grupo ? embedOne(grupo.familias) : null;
    return {
        id: art.id,
        codigo: art.codigo,
        nombre: art.nombre,
        unidad_de_medida: art.unidad_de_medida,
        is_epp: art.is_epp === true || art.is_epp === "t" || art.is_epp === "true",
        estado: art.estado,
        familia_codigo: familia?.codigo ?? "",
        familia_descripcion: familia?.descripcion ?? "",
        grupo_codigo: grupo?.codigo ?? "",
        grupo_descripcion: grupo?.descripcion ?? "",
    };
}

const ARTICULO_EMBED =
    "id, codigo, nombre, unidad_de_medida, is_epp, estado, grupos:id_grupo ( codigo, descripcion, familias:id_familia ( codigo, descripcion ) )";

export function explainInventarioError(errorOrMessage) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    if (/inventario_epp_personal/i.test(message) || (errorOrMessage?.code === "42501" && /epp/i.test(message))) {
        return "No tenés permiso para ver el inventario EPP. Pegá en el SQL Editor el ajuste de inventario EPP.";
    }
    return explainMissingDbFunction(message, message || "No se pudo cargar el inventario.");
}

export function diasHastaFecha(fecha) {
    if (!fecha) return null;
    const target = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export async function listInventarioArticulos({ idDeposito = "", search = "" } = {}) {
    const supabase = createBrowserClient();
    let query = supabase
        .from("inventario_depositos")
        .select(`id, cantidad_actual, updated_at, depositos:id_deposito ( id, codigo, nombre ), articulos:id_articulo (${ARTICULO_EMBED})`)
        .order("id");
    if (idDeposito) query = query.eq("id_deposito", idDeposito);
    const { data, error } = await query.limit(3000);
    if (error) throw error;
    const term = String(search ?? "").trim().toLowerCase();
    return (data ?? []).flatMap((row) => {
        const art = mapArticuloInventario(embedOne(row.articulos));
        if (!art) return [];
        const dep = embedOne(row.depositos);
        const mapped = {
            id: row.id,
            cantidad_actual: Number(row.cantidad_actual ?? 0),
            deposito_id: dep?.id ?? null,
            deposito_codigo: dep?.codigo ?? "",
            deposito_nombre: dep?.nombre ?? "",
            ...art,
        };
        if (!term) return [mapped];
        const hay = [
            mapped.codigo,
            mapped.nombre,
            mapped.deposito_codigo,
            mapped.deposito_nombre,
            mapped.familia_codigo,
            mapped.familia_descripcion,
            mapped.grupo_codigo,
            mapped.grupo_descripcion,
        ].join(" ").toLowerCase();
        return hay.includes(term) ? [mapped] : [];
    });
}

export async function listInventarioEpp({ idDeposito = "", search = "" } = {}) {
    const supabase = createBrowserClient();
    let query = supabase
        .from("inventario_epp_personal")
        .select(`
            id, cantidad, disponible, fecha_entrega, fecha_recambio,
            depositos:id_deposito ( id, codigo, nombre ),
            empleados:id_empleado ( id, nombre, apellido, dni, email ),
            articulos:id_articulo (${ARTICULO_EMBED})
        `)
        .order("fecha_recambio", { ascending: true, nullsFirst: false });
    if (idDeposito) query = query.eq("id_deposito", idDeposito);
    const { data, error } = await query.limit(3000);
    if (error) throw error;
    const term = String(search ?? "").trim().toLowerCase();
    return (data ?? []).flatMap((row) => {
        const art = mapArticuloInventario(embedOne(row.articulos)) ?? {
            id: null,
            codigo: "—",
            nombre: "Artículo",
            unidad_de_medida: "",
            is_epp: true,
            estado: "activo",
            familia_codigo: "",
            familia_descripcion: "",
            grupo_codigo: "",
            grupo_descripcion: "",
        };
        const dep = embedOne(row.depositos);
        const emp = embedOne(row.empleados);
        const dias = diasHastaFecha(row.fecha_recambio);
        const mapped = {
            id: row.id,
            cantidad: Number(row.cantidad ?? 0),
            disponible: row.disponible === true,
            fecha_entrega: row.fecha_entrega,
            fecha_recambio: row.fecha_recambio,
            dias_recambio: dias,
            debe_recambiar: dias != null && dias <= 0,
            deposito_id: dep?.id ?? null,
            deposito_codigo: dep?.codigo ?? "",
            deposito_nombre: dep?.nombre ?? "",
            empleado_nombre: emp?.nombre ?? "",
            empleado_apellido: emp?.apellido ?? "",
            empleado_dni: emp?.dni ?? "",
            empleado_email: emp?.email ?? "",
            ...art,
        };
        if (!term) return [mapped];
        const hay = [
            mapped.codigo,
            mapped.nombre,
            mapped.deposito_codigo,
            mapped.deposito_nombre,
            mapped.empleado_nombre,
            mapped.empleado_apellido,
            mapped.empleado_dni,
        ].join(" ").toLowerCase();
        return hay.includes(term) ? [mapped] : [];
    });
}
