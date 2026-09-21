import { createBrowserClient } from "@/lib/supabase";
import { formatNombreCompleto } from "@/utils/format";
import { nextFamiliaCodigo } from "./familias";
import { errorText, explainMissingDbFunction } from "./db-errors";
import { notificarCambioEstadoFamiliaGrupo } from "./notificaciones";

function embedResponsable(value) {
    if (!value)
        return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapAsignaciones(row) {
    const raw = Array.isArray(row.depositos_responsables) ? row.depositos_responsables : [];
    return raw
        .map((item) => {
            const responsable = embedResponsable(item.responsables);
            const id = item.id_responsable ?? responsable?.id ?? null;
            const etiqueta = formatNombreCompleto(responsable?.nombre, responsable?.apellido);
            return id
                ? {
                    id,
                    nombre: responsable?.nombre ?? "",
                    apellido: responsable?.apellido ?? "",
                    etiqueta: etiqueta ?? "Sin nombre",
                }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
}

function mapDeposito(row) {
    const responsables = mapAsignaciones(row);
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        ubicacion: row.ubicacion,
        cant_articulos: Number(row.cant_articulos ?? 0),
        costo_total: Number(row.costo_total ?? 0),
        estado: row.estado,
        responsables,
        responsableIds: responsables.map((item) => item.id),
        responsableNombres: responsables.map((item) => item.etiqueta).join(", "),
    };
}

function normalizeInput(input) {
    return {
        codigo: input.codigo.trim(),
        nombre: input.nombre.trim(),
        ubicacion: input.ubicacion.trim(),
        estado: input.estado === "inactivo" ? "inactivo" : "activo",
    };
}

export function nextDepositoCodigoDesdeActivos(rows) {
    return nextFamiliaCodigo((rows ?? [])
        .filter((row) => row.estado === "activo")
        .map((row) => row.codigo));
}

export function explainDepositoError(errorOrMessage, code) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    const resolvedCode = code ?? errorOrMessage?.code;
    if (resolvedCode === "23505") {
        return "Ya existe un depósito con ese código.";
    }
    if (resolvedCode === "23503") {
        return "No se puede eliminar: el depósito está vinculado a movimientos o inventario. Desactivalo para que no se pueda usar en movimientos nuevos.";
    }
    if (resolvedCode === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para gestionar depósitos.";
    }
    if (/todavía hay artículos/i.test(message)) {
        return "Todavía hay artículos en este depósito. Transferilos antes de inactivarlo o eliminarlo.";
    }
    if (/hay movimientos en el historial/i.test(message)) {
        return "No se puede eliminar: hay movimientos en el historial. Desactivalo para que no se pueda usar en movimientos nuevos.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar la operación.");
}

function chunkIds(ids, size = 80) {
    const chunks = [];
    for (let index = 0; index < ids.length; index += size) {
        chunks.push(ids.slice(index, index + size));
    }
    return chunks;
}

async function idsDepositosConMovimientos(supabase, ids) {
    const list = [...new Set((ids ?? []).filter(Boolean))];
    const used = new Set();
    if (list.length === 0) return used;
    for (const chunk of chunkIds(list)) {
        const [{ data: origen, error: origenError }, { data: destino, error: destinoError }] = await Promise.all([
            supabase.from("movimientos").select("id_deposito_origen").in("id_deposito_origen", chunk),
            supabase.from("movimientos").select("id_deposito_destino").in("id_deposito_destino", chunk),
        ]);
        if (origenError) throw origenError;
        if (destinoError) throw destinoError;
        for (const row of origen ?? []) {
            if (row.id_deposito_origen) used.add(row.id_deposito_origen);
        }
        for (const row of destino ?? []) {
            if (row.id_deposito_destino) used.add(row.id_deposito_destino);
        }
    }
    return used;
}

function withUsoDeposito(row, usados) {
    const tieneStock = Number(row.cant_articulos ?? 0) > 0;
    const tieneMovimientos = usados.has(row.id);
    return {
        ...row,
        tieneStock,
        tieneMovimientos,
        puedeEliminarse: !tieneStock && !tieneMovimientos,
    };
}

async function mapDepositosConUso(supabase, rows) {
    const mapped = (rows ?? []).map(mapDeposito);
    const usados = await idsDepositosConMovimientos(supabase, mapped.map((row) => row.id));
    return mapped.map((row) => withUsoDeposito(row, usados));
}

const DEPOSITO_SELECT = "id, codigo, nombre, ubicacion, cant_articulos, costo_total, estado, depositos_responsables ( id_responsable, responsables ( id, nombre, apellido ) )";

export async function listDepositos() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("depositos")
        .select(DEPOSITO_SELECT)
        .order("codigo", { ascending: true });
    if (error)
        throw error;
    return mapDepositosConUso(supabase, data);
}

export async function listDepositosParaAsignacion() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_depositos_activos_registro", {});
    if (error)
        throw error;
    return (data ?? []).map((row) => ({
        id: row.id,
        codigo: row.codigo ?? "",
        nombre: row.nombre ?? "",
        ubicacion: row.ubicacion ?? "",
        estado: "activo",
    }));
}

export async function listDepositosActivos() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("depositos")
        .select(DEPOSITO_SELECT)
        .eq("estado", "activo")
        .order("codigo", { ascending: true });
    if (error)
        throw error;
    return (data ?? []).map(mapDeposito);
}

export async function listDepositosPropios() {
    const supabase = createBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];
    const { data: responsable, error: respError } = await supabase
        .from("responsables")
        .select("id")
        .eq("auth_user_id", userId)
        .maybeSingle();
    if (respError) throw respError;
    if (!responsable) return [];
    const { data, error } = await supabase
        .from("depositos_responsables")
        .select(`depositos:id_deposito (${DEPOSITO_SELECT})`)
        .eq("id_responsable", responsable.id);
    if (error) throw error;
    const mapped = (data ?? [])
        .map((row) => {
            const dep = Array.isArray(row.depositos) ? row.depositos[0] : row.depositos;
            return dep ? mapDeposito(dep) : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    const usados = await idsDepositosConMovimientos(supabase, mapped.map((row) => row.id));
    return mapped.map((row) => withUsoDeposito(row, usados));
}

export async function listResponsablesOpciones() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("responsables")
        .select("id, nombre, apellido, estado")
        .order("apellido", { ascending: true })
        .order("nombre", { ascending: true });
    if (error)
        throw error;
    return (data ?? []).map((row) => ({
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        estado: row.estado,
        etiqueta: formatNombreCompleto(row.nombre, row.apellido) ?? "Sin nombre",
    }));
}

export async function createDeposito(input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data, error } = await supabase
        .from("depositos")
        .insert({
            codigo: payload.codigo,
            nombre: payload.nombre,
            ubicacion: payload.ubicacion,
            estado: "activo",
        })
        .select("id")
        .single();
    if (error)
        throw error;
    return data;
}

export async function updateDeposito(id, input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data: previa, error: previaError } = await supabase
        .from("depositos")
        .select("estado, cant_articulos")
        .eq("id", id)
        .maybeSingle();
    if (previaError)
        throw previaError;
    if (payload.estado === "inactivo" && Number(previa?.cant_articulos ?? 0) > 0) {
        throw new Error("Todavía hay artículos en este depósito. Transferilos antes de inactivarlo.");
    }
    const { data, error } = await supabase
        .from("depositos")
        .update({
            codigo: payload.codigo,
            nombre: payload.nombre,
            ubicacion: payload.ubicacion,
            estado: payload.estado,
        })
        .eq("id", id)
        .select(DEPOSITO_SELECT)
        .single();
    if (error)
        throw error;
    const updated = mapDeposito(data);
    const usados = await idsDepositosConMovimientos(supabase, [updated.id]);
    const mapped = withUsoDeposito(updated, usados);
    if (previa?.estado && previa.estado !== payload.estado) {
        await notificarCambioEstadoFamiliaGrupo({
            tabla: "depositos",
            id,
            codigo: payload.codigo,
            descripcion: payload.nombre,
            estado: payload.estado,
        });
    }
    return mapped;
}

function isMissingRpc(error) {
    const text = errorText(error);
    return error?.code === "PGRST202"
        || /Could not find the function|does not exist|42883|schema cache/i.test(text);
}

export async function desactivarDeposito(deposito) {
    return updateDeposito(deposito.id, {
        codigo: deposito.codigo,
        nombre: deposito.nombre,
        ubicacion: deposito.ubicacion,
        estado: "inactivo",
    });
}

async function assertDepositoEliminable(supabase, id) {
    const { data: dep, error: depError } = await supabase
        .from("depositos")
        .select("id, codigo, nombre, cant_articulos")
        .eq("id", id)
        .maybeSingle();
    if (depError) throw depError;
    if (!dep) throw new Error("El depósito no existe");
    if (Number(dep.cant_articulos ?? 0) > 0) {
        throw new Error("Todavía hay artículos en este depósito. Transferilos primero.");
    }
    const usados = await idsDepositosConMovimientos(supabase, [id]);
    if (usados.has(id)) {
        throw new Error("No se puede eliminar: hay movimientos en el historial. Desactivalo para que no se pueda usar en movimientos nuevos.");
    }
    return dep;
}

async function eliminarDepositoDirecto(supabase, id) {
    const dep = await assertDepositoEliminable(supabase, id);
    const { error: invError } = await supabase
        .from("inventario_depositos")
        .delete()
        .eq("id_deposito", id)
        .eq("cantidad_actual", 0);
    if (invError) throw invError;
    const { error: delError } = await supabase.from("depositos").delete().eq("id", id);
    if (delError) throw delError;
    await supabase.rpc("fn_insertar_notificacion_por_nombre", {
        p_tipo: "Eliminacion",
        p_descripcion: `Se eliminó el depósito ${dep.codigo} – ${dep.nombre}.`,
        p_tabla: "depositos",
        p_valor: id,
    });
}

export async function eliminarDeposito(id) {
    const supabase = createBrowserClient();
    await assertDepositoEliminable(supabase, id);
    const { error } = await supabase.rpc("rpc_eliminar_deposito", {
        p_deposito: id,
    });
    if (!error) return;
    if (!isMissingRpc(error)) throw error;
    await eliminarDepositoDirecto(supabase, id);
}

export async function upsertDepositos(inputs) {
    const supabase = createBrowserClient();
    const payloads = inputs.map((input) => ({
        codigo: input.codigo.trim(),
        nombre: input.nombre.trim(),
        ubicacion: input.ubicacion.trim(),
    }));
    const { data, error } = await supabase.rpc("rpc_upsert_depositos_masivo", {
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

export async function actualizarMisDepositos(idsDepositos) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_actualizar_mis_depositos", {
        p_depositos: idsDepositos,
    });
    if (error)
        throw error;
    return data ?? { assigned: 0, removed: 0 };
}

export async function asignarResponsablesDeposito(idDeposito, idsResponsables) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_asignar_responsables_deposito", {
        p_deposito: idDeposito,
        p_responsables: idsResponsables,
    });
    if (error)
        throw error;
    return data ?? { assigned: 0, removed: 0 };
}
