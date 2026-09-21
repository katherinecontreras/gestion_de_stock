import { createBrowserClient } from "@/lib/supabase";
import { nextFamiliaCodigo } from "./familias";
import { errorText, explainMissingDbFunction } from "./db-errors";
import { notificarCambioEstadoFamiliaGrupo } from "./notificaciones";
import { labelTipoMovimiento } from "@/utils/movimientos";

const ARTICULO_SELECT =
    "id, codigo, nombre, unidad_de_medida, is_epp, estado, id_grupo, id_familia, grupo_codigo, grupo_descripcion, familia_codigo, familia_descripcion, costo_actual";

const ARTICULO_TABLE_SELECT =
    "id, codigo, nombre, unidad_de_medida, is_epp, estado, id_grupo, grupos:id_grupo ( codigo, descripcion, id_familia, familias:id_familia ( id, codigo, descripcion ) )";

function normalizeInput(input) {
    return {
        codigo: String(input.codigo ?? "").trim(),
        nombre: String(input.nombre ?? "").trim(),
        unidad_de_medida: String(input.unidad_de_medida ?? "").trim(),
        id_grupo: input.id_grupo || null,
        is_epp: Boolean(input.is_epp),
        estado: input.estado === "inactivo" ? "inactivo" : "activo",
    };
}

export const ARTICULOS_PAGE_SIZE = 50;

export function nextArticuloCodigoDesdeActivos(rows) {
    return nextFamiliaCodigo(
        (rows ?? [])
            .filter((row) => row.estado === "activo")
            .map((row) => row.codigo),
    );
}

function sanitizeSearch(value) {
    return String(value ?? "").replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
}

function applyArticuloFiltrosVista(query, { search, idFamilia, idGrupo, epp }) {
    let next = query;
    if (idFamilia) next = next.eq("id_familia", idFamilia);
    if (idGrupo) next = next.eq("id_grupo", idGrupo);
    if (epp === "si") next = next.eq("is_epp", true);
    if (epp === "no") next = next.eq("is_epp", false);
    const term = sanitizeSearch(search);
    if (term) {
        next = next.or(`nombre.ilike.%${term}%,codigo.ilike.%${term}%,familia_codigo.ilike.%${term}%,grupo_codigo.ilike.%${term}%`);
    }
    return next;
}

async function grupoIdsDeFamilia(supabase, idFamilia) {
    const { data, error } = await supabase
        .from("grupos")
        .select("id")
        .eq("id_familia", idFamilia);
    if (error) throw error;
    return (data ?? []).map((row) => row.id);
}

async function grupoIdsPorBusqueda(supabase, term) {
    const [{ data: grupos, error: gruposError }, { data: familias, error: familiasError }] = await Promise.all([
        supabase.from("grupos").select("id").or(`codigo.ilike.%${term}%,descripcion.ilike.%${term}%`),
        supabase.from("familias").select("id").or(`codigo.ilike.%${term}%,descripcion.ilike.%${term}%`),
    ]);
    if (gruposError) throw gruposError;
    if (familiasError) throw familiasError;
    const ids = new Set((grupos ?? []).map((row) => row.id));
    const familiaIds = (familias ?? []).map((row) => row.id);
    if (familiaIds.length > 0) {
        const { data: extra, error } = await supabase
            .from("grupos")
            .select("id")
            .in("id_familia", familiaIds);
        if (error) throw error;
        for (const row of extra ?? []) ids.add(row.id);
    }
    return [...ids];
}

async function applyArticuloFiltrosTabla(supabase, query, { search, idFamilia, idGrupo, epp }) {
    let next = query;
    if (idGrupo) {
        next = next.eq("id_grupo", idGrupo);
    } else if (idFamilia) {
        const ids = await grupoIdsDeFamilia(supabase, idFamilia);
        if (ids.length === 0) return { empty: true, query: next };
        next = next.in("id_grupo", ids);
    }
    if (epp === "si") next = next.eq("is_epp", true);
    if (epp === "no") next = next.eq("is_epp", false);
    const term = sanitizeSearch(search);
    if (term) {
        const extraGrupoIds = await grupoIdsPorBusqueda(supabase, term);
        const parts = [`nombre.ilike.%${term}%`, `codigo.ilike.%${term}%`];
        if (extraGrupoIds.length > 0) parts.push(`id_grupo.in.(${extraGrupoIds.join(",")})`);
        next = next.or(parts.join(","));
    }
    return { empty: false, query: next };
}

async function costosActualesPorArticulos(supabase, ids) {
    if (ids.length === 0) return new Map();
    const { data, error } = await supabase
        .from("costos_articulos")
        .select("id_articulo, costo, fecha, created_at")
        .in("id_articulo", ids);
    if (error) throw error;
    const latest = new Map();
    for (const row of data ?? []) {
        const prev = latest.get(row.id_articulo);
        if (!prev) {
            latest.set(row.id_articulo, row);
            continue;
        }
        const newer = row.fecha > prev.fecha
            || (row.fecha === prev.fecha && String(row.created_at) > String(prev.created_at));
        if (newer) latest.set(row.id_articulo, row);
    }
    return new Map([...latest].map(([id, row]) => [id, Number(row.costo)]));
}

export function explainArticuloError(errorOrMessage, code) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    const resolvedCode = code ?? errorOrMessage?.code;
    if (resolvedCode === "23505") {
        return "Ese código de artículo ya existe. El código tiene que ser único.";
    }
    if (resolvedCode === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para gestionar artículos.";
    }
    if (/hay movimientos en el historial/i.test(message)) {
        return "No se puede eliminar: hay movimientos en el historial. Desactivalo para que no se puedan hacer más movimientos con él.";
    }
    if (resolvedCode === "23503") {
        return "No se puede eliminar: hay registros relacionados. Desactivalo para que no se puedan hacer más movimientos con él.";
    }
    if (/is_epp|column .* does not exist/i.test(message)) {
        return "Falta la columna is_epp en artículos. Pegá el SQL del chat en el SQL Editor.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar la operación.");
}

function mapArticulo(row) {
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        unidad_de_medida: row.unidad_de_medida,
        is_epp: row.is_epp === true || row.is_epp === "t" || row.is_epp === "true" || row.is_epp === "X",
        estado: row.estado,
        id_grupo: row.id_grupo ?? null,
        id_familia: row.id_familia ?? null,
        grupo_codigo: row.grupo_codigo ?? "",
        grupo_descripcion: row.grupo_descripcion ?? "",
        familia_codigo: row.familia_codigo ?? "",
        familia_descripcion: row.familia_descripcion ?? "",
        costo_actual: row.costo_actual == null ? null : Number(row.costo_actual),
    };
}

function mapArticuloDesdeTabla(row, costo = null) {
    const grupo = Array.isArray(row.grupos) ? row.grupos[0] : row.grupos;
    const familia = grupo
        ? (Array.isArray(grupo.familias) ? grupo.familias[0] : grupo.familias)
        : null;
    return mapArticulo({
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        unidad_de_medida: row.unidad_de_medida,
        is_epp: row.is_epp,
        estado: row.estado,
        id_grupo: row.id_grupo ?? null,
        id_familia: familia?.id ?? grupo?.id_familia ?? null,
        grupo_codigo: grupo?.codigo ?? "",
        grupo_descripcion: grupo?.descripcion ?? "",
        familia_codigo: familia?.codigo ?? "",
        familia_descripcion: familia?.descripcion ?? "",
        costo_actual: costo,
    });
}

async function idsArticulosEnInventarioPropio(supabase) {
    const { data, error } = await supabase
        .from("inventario_depositos")
        .select("id_articulo");
    if (error) throw error;
    return [...new Set((data ?? []).map((row) => row.id_articulo).filter(Boolean))];
}

function applyIdsPropios(query, idsPropios) {
    if (!idsPropios) return query;
    return query.in("id", idsPropios);
}

function chunkIds(ids, size = 120) {
    const chunks = [];
    for (let index = 0; index < ids.length; index += size) {
        chunks.push(ids.slice(index, index + size));
    }
    return chunks;
}

function uniqueById(rows) {
    const seen = new Set();
    const unique = [];
    for (const row of rows ?? []) {
        if (!row?.id || seen.has(row.id)) continue;
        seen.add(row.id);
        unique.push(row);
    }
    return unique;
}

async function withTieneMovimientos(supabase, rows) {
    const unique = uniqueById(rows);
    const ids = unique.map((row) => row.id);
    if (ids.length === 0) return unique;
    const used = new Set();
    for (const chunk of chunkIds(ids, 120)) {
        const { data, error } = await supabase
            .from("movimientos_articulos")
            .select("id_articulo")
            .in("id_articulo", chunk);
        if (error) throw error;
        for (const row of data ?? []) {
            if (row.id_articulo) used.add(row.id_articulo);
        }
    }
    return unique.map((row) => ({ ...row, tiene_movimientos: used.has(row.id) }));
}

function embedOne(value) {
    return Array.isArray(value) ? value[0] ?? null : (value ?? null);
}

function fraseTipoMovimiento(tipo, cantidad) {
    const n = Number(cantidad) || 0;
    if (tipo === "Entrada") return n === 1 ? "1 entrada" : `${n} entradas`;
    if (tipo === "Salida") return n === 1 ? "1 salida" : `${n} salidas`;
    if (tipo === "Transferencia") return n === 1 ? "1 transferencia" : `${n} transferencias`;
    if (tipo === "Entrega_EPP") return n === 1 ? "1 entrega EPP" : `${n} entregas EPP`;
    const label = labelTipoMovimiento(tipo).toLowerCase();
    return n === 1 ? `1 ${label}` : `${n} ${label}`;
}

export function fraseMovimientosArticulo(resumen) {
    const parts = (resumen?.porTipo ?? []).map((item) => fraseTipoMovimiento(item.tipo, item.cantidad));
    if (parts.length === 0) {
        const total = Number(resumen?.total) || 0;
        if (total === 1) return "1 movimiento";
        if (total > 1) return `${total} movimientos`;
        return "";
    }
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
    return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

function compareArticulos(a, b, sort) {
    const dir = sort.dir === "desc" ? -1 : 1;
    if (sort.key === "costo") {
        return ((Number(a.costo_actual ?? 0) - Number(b.costo_actual ?? 0)) || String(a.id).localeCompare(String(b.id))) * dir;
    }
    const left = sort.key === "nombre" ? a.nombre : a.codigo;
    const right = sort.key === "nombre" ? b.nombre : b.codigo;
    return String(left).localeCompare(String(right), "es", { numeric: true }) * dir
        || String(a.id).localeCompare(String(b.id));
}

export async function listArticulosPagina({
    search = "",
    idFamilia = "",
    idGrupo = "",
    epp = "todos",
    sort = { key: "codigo", dir: "asc" },
    page = 0,
    pageSize = ARTICULOS_PAGE_SIZE,
    soloMisDepositos = false,
} = {}) {
    const supabase = createBrowserClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const filtros = { search, idFamilia, idGrupo, epp };
    const sortByCosto = sort.key === "costo";
    const sortColumn = sort.key === "nombre" ? "nombre" : "codigo";
    const idsPropios = soloMisDepositos
        ? await idsArticulosEnInventarioPropio(supabase)
        : null;
    if (idsPropios && idsPropios.length === 0) {
        return { rows: [], total: 0 };
    }

    if (idsPropios && idsPropios.length > 120) {
        const collected = [];
        for (const chunk of chunkIds(idsPropios)) {
            if (sortByCosto) {
                let query = supabase.from("v_articulos_costo_actual").select(ARTICULO_SELECT);
                query = applyArticuloFiltrosVista(query, filtros).in("id", chunk);
                const { data, error } = await query;
                if (error) throw error;
                collected.push(...(data ?? []).map(mapArticulo));
            } else {
                let query = supabase.from("articulos").select(ARTICULO_TABLE_SELECT).in("id", chunk);
                const filtered = await applyArticuloFiltrosTabla(supabase, query, filtros);
                if (filtered.empty) continue;
                const { data, error } = await filtered.query;
                if (error) throw error;
                const costos = await costosActualesPorArticulos(supabase, (data ?? []).map((row) => row.id));
                collected.push(...(data ?? []).map((row) => mapArticuloDesdeTabla(row, costos.get(row.id) ?? null)));
            }
        }
        collected.sort((a, b) => compareArticulos(a, b, sort));
        const unique = await withTieneMovimientos(supabase, collected);
        return {
            rows: unique.slice(from, to + 1),
            total: unique.length,
        };
    }

    if (sortByCosto) {
        let query = supabase
            .from("v_articulos_costo_actual")
            .select(ARTICULO_SELECT, { count: "exact" });
        query = applyIdsPropios(applyArticuloFiltrosVista(query, filtros), idsPropios);
        const { data, error, count } = await query
            .order("costo_actual", { ascending: sort.dir !== "desc", nullsFirst: false })
            .order("id", { ascending: true })
            .range(from, to);
        if (error) throw error;
        return {
            rows: await withTieneMovimientos(supabase, (data ?? []).map(mapArticulo)),
            total: count ?? 0,
        };
    }

    let query = supabase
        .from("articulos")
        .select(ARTICULO_TABLE_SELECT, { count: "exact" });
    query = applyIdsPropios(query, idsPropios);
    const filtered = await applyArticuloFiltrosTabla(supabase, query, filtros);
    if (filtered.empty) {
        return { rows: [], total: 0 };
    }
    const { data, error, count } = await filtered.query
        .order(sortColumn, { ascending: sort.dir !== "desc" })
        .order("id", { ascending: true })
        .range(from, to);
    if (error) throw error;
    const rows = data ?? [];
    const costos = await costosActualesPorArticulos(supabase, rows.map((row) => row.id));
    return {
        rows: await withTieneMovimientos(supabase, rows.map((row) => mapArticuloDesdeTabla(row, costos.get(row.id) ?? null))),
        total: count ?? 0,
    };
}

export async function listArticulosExport(filtros = {}) {
    const supabase = createBrowserClient();
    const { idFamilia = "", idGrupo = "", soloMisDepositos = false } = filtros;
    const idsPropios = soloMisDepositos
        ? await idsArticulosEnInventarioPropio(supabase)
        : null;
    if (idsPropios && idsPropios.length === 0) return [];

    async function fetchChunk(ids = null) {
        const collected = [];
        let from = 0;
        const pageSize = 500;
        while (true) {
            let query = supabase
                .from("articulos")
                .select(ARTICULO_TABLE_SELECT)
                .order("codigo", { ascending: true })
                .order("id", { ascending: true })
                .range(from, from + pageSize - 1);
            if (ids) query = query.in("id", ids);
            const filtered = await applyArticuloFiltrosTabla(supabase, query, {
                search: "",
                idFamilia,
                idGrupo,
                epp: "todos",
            });
            if (filtered.empty) return collected;
            const { data, error } = await filtered.query;
            if (error) throw error;
            const rows = data ?? [];
            collected.push(...rows.map((row) => mapArticuloDesdeTabla(row, null)));
            if (rows.length < pageSize) break;
            from += pageSize;
        }
        return collected;
    }

    if (idsPropios && idsPropios.length > 120) {
        const collected = [];
        for (const chunk of chunkIds(idsPropios)) {
            collected.push(...await fetchChunk(chunk));
        }
        collected.sort((a, b) => compareArticulos(a, b, { key: "codigo", dir: "asc" }));
        return collected;
    }

    return fetchChunk(idsPropios);
}

export async function nextArticuloCodigoSugerido() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("articulos")
        .select("codigo")
        .eq("estado", "activo")
        .filter("codigo", "match", "^[0-9]+$")
        .order("codigo", { ascending: false })
        .limit(200);
    if (error) throw error;
    return nextArticuloCodigoDesdeActivos((data ?? []).map((row) => ({ ...row, estado: "activo" })));
}

export async function findArticuloPorCodigo(codigo, ignoreId) {
    const key = String(codigo ?? "").trim();
    if (!key) return null;
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("articulos")
        .select("id, codigo, nombre, estado, grupos:id_grupo ( codigo, descripcion, familias:id_familia ( codigo, descripcion ) )")
        .ilike("codigo", key.replace(/[%_]/g, "\\$&"))
        .limit(2);
    if (error) throw error;
    const row = (data ?? []).find((item) => item.id !== ignoreId) ?? null;
    if (!row) return null;
    const grupo = Array.isArray(row.grupos) ? row.grupos[0] : row.grupos;
    const familia = grupo
        ? (Array.isArray(grupo.familias) ? grupo.familias[0] : grupo.familias)
        : null;
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        estado: row.estado,
        grupo_codigo: grupo?.codigo ?? "",
        grupo_descripcion: grupo?.descripcion ?? "",
        familia_codigo: familia?.codigo ?? "",
        familia_descripcion: familia?.descripcion ?? "",
    };
}

export async function getArticulo(id) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("v_articulos_costo_actual")
        .select(ARTICULO_SELECT)
        .eq("id", id)
        .maybeSingle();
    if (error) throw error;
    return data ? mapArticulo(data) : null;
}

export async function listFamiliasOpciones() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("familias")
        .select("id, codigo, descripcion, estado")
        .order("codigo", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function listGruposOpciones() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("grupos")
        .select("id, id_familia, codigo, descripcion, estado")
        .order("codigo", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function listDepositosOpciones() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("depositos")
        .select("id, codigo, nombre, estado, cant_articulos")
        .order("codigo", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

const INVENTARIO_ARTICULO_SELECT =
    "id_deposito, cantidad_actual, articulos:id_articulo ( id, codigo, nombre, unidad_de_medida, is_epp, estado, grupos:id_grupo ( codigo, descripcion, familias:id_familia ( codigo, descripcion ) ) )";

function mapInventarioArticulo(row) {
    const art = Array.isArray(row.articulos) ? row.articulos[0] : row.articulos;
    if (!art) return null;
    const grupo = Array.isArray(art.grupos) ? art.grupos[0] : art.grupos;
    const familia = grupo
        ? (Array.isArray(grupo.familias) ? grupo.familias[0] : grupo.familias)
        : null;
    return {
        id_deposito: row.id_deposito ?? null,
        codigo: art.codigo,
        nombre: art.nombre,
        unidad_de_medida: art.unidad_de_medida,
        is_epp: art.is_epp === true || art.is_epp === "t" || art.is_epp === "true" || art.is_epp === "X",
        estado: art.estado,
        familia_codigo: familia?.codigo ?? "",
        familia_descripcion: familia?.descripcion ?? "",
        grupo_codigo: grupo?.codigo ?? "",
        grupo_descripcion: grupo?.descripcion ?? "",
        cantidad_actual: Number(row.cantidad_actual ?? 0),
    };
}

export async function listArticulosPorDepositos(idsDepositos) {
    const ids = [...new Set((idsDepositos ?? []).filter(Boolean).map((id) => String(id)))];
    if (!ids.length) return [];
    const supabase = createBrowserClient();
    const collected = [];
    const pageSize = 500;
    for (const chunk of chunkIds(ids, 80)) {
        let from = 0;
        while (true) {
            const { data, error } = await supabase
                .from("inventario_depositos")
                .select(INVENTARIO_ARTICULO_SELECT)
                .in("id_deposito", chunk)
                .order("id")
                .range(from, from + pageSize - 1);
            if (error) throw error;
            const rows = data ?? [];
            for (const row of rows) {
                const mapped = mapInventarioArticulo(row);
                if (mapped) collected.push(mapped);
            }
            if (rows.length < pageSize) break;
            from += pageSize;
        }
    }
    return collected;
}

export async function listArticulosPorDeposito(idDeposito) {
    return listArticulosPorDepositos([idDeposito]);
}

async function insertCosto(supabase, idArticulo, costo) {
    const value = Number(costo);
    if (!Number.isFinite(value) || value < 0) return;
    const { error } = await supabase.from("costos_articulos").insert({
        id_articulo: idArticulo,
        costo: value,
    });
    if (error) throw error;
}

export async function createArticulo(input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data, error } = await supabase
        .from("articulos")
        .insert({
            codigo: payload.codigo,
            nombre: payload.nombre,
            unidad_de_medida: payload.unidad_de_medida,
            id_grupo: payload.id_grupo,
            is_epp: payload.is_epp,
            estado: "activo",
        })
        .select("id")
        .single();
    if (error) throw error;
    if (input.costo != null && input.costo !== "") {
        await insertCosto(supabase, data.id, input.costo);
    }
    return data;
}

export async function updateArticulo(id, input) {
    const supabase = createBrowserClient();
    const payload = normalizeInput(input);
    const { data: previa, error: previaError } = await supabase
        .from("articulos")
        .select("estado, codigo, nombre")
        .eq("id", id)
        .maybeSingle();
    if (previaError) throw previaError;
    const { error } = await supabase
        .from("articulos")
        .update({
            codigo: payload.codigo,
            nombre: payload.nombre,
            unidad_de_medida: payload.unidad_de_medida,
            id_grupo: payload.id_grupo,
            is_epp: payload.is_epp,
            estado: payload.estado,
        })
        .eq("id", id);
    if (error) throw error;
    if (input.nuevoCosto != null && input.nuevoCosto !== "") {
        await insertCosto(supabase, id, input.nuevoCosto);
    }
    if (previa?.estado && previa.estado !== payload.estado) {
        await notificarCambioEstadoFamiliaGrupo({
            tabla: "articulos",
            id,
            codigo: payload.codigo,
            descripcion: payload.nombre,
            estado: payload.estado,
        });
    }
}

const ARTICULOS_MASIVO_CHUNK = 400;

function etiquetaFamiliaCarga(codigo, labels) {
    const key = String(codigo ?? "").trim();
    if (!key) return "sin familia";
    return labels.get(key.toLowerCase()) || key;
}

function fraseCantidadArticulos(count, label) {
    const art = count === 1 ? "artículo" : "artículos";
    return `${count} ${art} a ${label}`;
}

export function mensajeCargaMasivaArticulos({
    altas,
    updated,
    created = 0,
    quitados = 0,
    alcanceLabel = "",
}) {
    const partes = [];
    if (altas.length > 0) {
        const totalAltas = altas.reduce((sum, item) => sum + item.count, 0);
        const listado = altas.map((item) => fraseCantidadArticulos(item.count, item.label));
        const unidos = listado.length === 1
            ? listado[0]
            : `${listado.slice(0, -1).join(", ")} y ${listado[listado.length - 1]}`;
        partes.push(totalAltas === 1 ? `Se agregó ${unidos}.` : `Se agregaron ${unidos}.`);
    } else if (created > 0) {
        partes.push(created === 1 ? "Se agregó 1 artículo." : `Se agregaron ${created} artículos.`);
    }
    if (updated > 0) {
        partes.push(updated === 1 ? "Se editó 1 artículo." : `Se editaron ${updated} artículos.`);
    }
    if (quitados > 0) {
        const donde = alcanceLabel ? ` de ${alcanceLabel}` : "";
        partes.push(quitados === 1
            ? `En el Excel no estaba 1 artículo${donde}.`
            : `En el Excel no estaban ${quitados} artículos${donde}.`);
    }
    return partes.length
        ? partes.join(" ")
        : "Carga masiva lista: ningún artículo cambió.";
}

async function existingArticuloCodigoSet(supabase, codigos) {
    const set = new Set();
    const unique = [...new Set(codigos.map((codigo) => String(codigo ?? "").trim()).filter(Boolean))];
    for (const chunk of chunkIds(unique, 120)) {
        const { data, error } = await supabase
            .from("articulos")
            .select("codigo")
            .in("codigo", chunk);
        if (error) throw error;
        for (const row of data ?? []) set.add(String(row.codigo).toLowerCase());
    }
    return set;
}

async function etiquetasFamiliaPorCodigo(supabase, codigos) {
    const labels = new Map();
    const unique = [...new Set(codigos.map((codigo) => String(codigo ?? "").trim()).filter(Boolean))];
    if (!unique.length) return labels;
    const { data, error } = await supabase
        .from("familias")
        .select("codigo, descripcion");
    if (error) throw error;
    for (const row of data ?? []) {
        const key = String(row.codigo).toLowerCase();
        labels.set(key, `${row.codigo} – ${row.descripcion}`);
    }
    return labels;
}

export async function upsertArticulos(inputs, { existentes = [], alcanceLabel = "" } = {}) {
    const supabase = createBrowserClient();
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const total = inputs.length;
    const excelCodes = new Set(inputs.map((row) => String(row.codigo).toLowerCase()));
    const vistos = new Set();
    const quitados = [];
    for (const row of existentes) {
        const key = String(row.codigo ?? "").trim().toLowerCase();
        if (!key || vistos.has(key)) continue;
        vistos.add(key);
        if (!excelCodes.has(key)) quitados.push(row);
    }
    const existentesCodigos = await existingArticuloCodigoSet(supabase, inputs.map((row) => row.codigo));
    const altasMap = new Map();
    for (const row of inputs) {
        if (existentesCodigos.has(String(row.codigo).toLowerCase())) continue;
        const key = String(row.familia_codigo ?? "").trim().toLowerCase();
        altasMap.set(key, (altasMap.get(key) ?? 0) + 1);
    }
    const labels = await etiquetasFamiliaPorCodigo(supabase, [...altasMap.keys()]);
    const altas = [...altasMap.entries()]
        .filter(([, count]) => count > 0)
        .sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }))
        .map(([codigo, count]) => ({
            codigo,
            count,
            label: etiquetaFamiliaCarga(codigo, labels),
        }));

    for (let index = 0; index < inputs.length; index += ARTICULOS_MASIVO_CHUNK) {
        const slice = inputs.slice(index, index + ARTICULOS_MASIVO_CHUNK);
        const { data, error } = await supabase.rpc("rpc_upsert_articulos_masivo", {
            p_filas: slice,
            p_notificar: false,
        });
        if (error) throw error;
        created += Number(data?.created ?? 0);
        updated += Number(data?.updated ?? 0);
        unchanged += Number(data?.unchanged ?? 0);
    }

    const mensaje = mensajeCargaMasivaArticulos({
        altas: created > 0 ? altas : [],
        updated,
        created,
        quitados: quitados.length,
        alcanceLabel,
    });
    if (created + updated + quitados.length > 0) {
        const { error: notifyError } = await supabase.rpc("fn_insertar_notificacion_por_nombre", {
            p_tipo: "Carga_Masiva",
            p_descripcion: mensaje,
            p_tabla: "articulos",
            p_valor: null,
            p_metadata: {
                tabla: "articulos",
                creados: created,
                editados: updated,
                sin_cambios: unchanged,
                omitidos_excel: quitados.length,
                total,
                por_familia: altas,
                alcance: alcanceLabel || null,
            },
        });
        if (notifyError) throw notifyError;
    }

    return {
        total: created + updated + unchanged,
        updated,
        created,
        unchanged,
        quitados: quitados.length,
        mensaje,
        altas,
    };
}

function isMissingRpc(error) {
    const text = errorText(error);
    return error?.code === "PGRST202"
        || /Could not find the function|does not exist|42883|schema cache/i.test(text);
}

async function eliminarArticuloDirecto(supabase, id) {
    const { data: art, error: artError } = await supabase
        .from("articulos")
        .select("id, codigo, nombre")
        .eq("id", id)
        .maybeSingle();
    if (artError) throw artError;
    if (!art) throw new Error("El artículo no existe");

    const { count, error: movError } = await supabase
        .from("movimientos_articulos")
        .select("id", { count: "exact", head: true })
        .eq("id_articulo", id);
    if (movError) throw movError;
    if ((count ?? 0) > 0) {
        throw new Error("No se puede eliminar: hay movimientos en el historial. Desactivalo para que no se puedan hacer más movimientos con él.");
    }

    const { error: invError } = await supabase.from("inventario_depositos").delete().eq("id_articulo", id);
    if (invError) throw invError;
    const { error: costoError } = await supabase.from("costos_articulos").delete().eq("id_articulo", id);
    if (costoError) throw costoError;
    const { error: delError } = await supabase.from("articulos").delete().eq("id", id);
    if (delError) throw delError;

    await supabase.rpc("fn_insertar_notificacion_por_nombre", {
        p_tipo: "Eliminacion",
        p_descripcion: `Se eliminó el artículo ${art.codigo} – ${art.nombre}.`,
        p_tabla: "articulos",
        p_valor: id,
    });
}

export async function eliminarArticulo(id) {
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc("rpc_eliminar_articulo", {
        p_articulo: id,
    });
    if (!error) return;
    if (!isMissingRpc(error)) throw error;
    await eliminarArticuloDirecto(supabase, id);
}

export async function desactivarArticulo(articulo) {
    await updateArticulo(articulo.id, {
        ...articulo,
        estado: "inactivo",
        nuevoCosto: "",
    });
}

export async function resumenMovimientosArticulo(idArticulo) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("movimientos_articulos")
        .select("id, id_movimiento, movimientos:id_movimiento ( id, tipos_movimiento ( tipo ) )")
        .eq("id_articulo", idArticulo);
    if (error) throw error;

    const counts = new Map();
    const seenMov = new Set();
    for (const row of data ?? []) {
        const movId = row.id_movimiento ?? embedOne(row.movimientos)?.id;
        if (movId && seenMov.has(movId)) continue;
        if (movId) seenMov.add(movId);
        const tipoRow = embedOne(embedOne(row.movimientos)?.tipos_movimiento);
        const tipo = tipoRow?.tipo || "Movimiento";
        counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
    }

    return {
        total: seenMov.size || (data ?? []).length,
        porTipo: [...counts.entries()]
            .map(([tipo, cantidad]) => ({ tipo, cantidad }))
            .sort((a, b) => a.tipo.localeCompare(b.tipo, "es")),
    };
}

export async function listCostosArticulo(idArticulo) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("costos_articulos")
        .select("id, fecha, costo, created_at")
        .eq("id_articulo", idArticulo)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function listMovimientosArticulo(idArticulo) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("movimientos_articulos")
        .select("id, cantidad, observacion, created_at, movimientos:id_movimiento ( id, fecha, nro_remito, motivo, fecha_recambio, tipo_entrega_epp, tipos_movimiento ( tipo ), deposito_origen:id_deposito_origen ( id, codigo, nombre, ubicacion ), deposito_destino:id_deposito_destino ( id, codigo, nombre, ubicacion ), empleado:id_empleado ( nombre, apellido, dni ) )")
        .eq("id_articulo", idArticulo)
        .order("created_at", { ascending: false });
    if (error) {
        const fallback = await supabase
            .from("movimientos_articulos")
            .select("id, cantidad, observacion, created_at, movimientos:id_movimiento ( id, fecha, nro_remito, motivo, tipos_movimiento ( tipo ), deposito_origen:id_deposito_origen ( id, codigo, nombre, ubicacion ), deposito_destino:id_deposito_destino ( id, codigo, nombre, ubicacion ) )")
            .eq("id_articulo", idArticulo)
            .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        return fallback.data ?? [];
    }
    return data ?? [];
}

export async function listStockArticuloPorDepositos(idArticulo) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("inventario_depositos")
        .select("id, cantidad_actual, depositos:id_deposito ( id, codigo, nombre, ubicacion )")
        .eq("id_articulo", idArticulo)
        .order("id");
    if (error) throw error;
    return (data ?? []).flatMap((row) => {
        const dep = Array.isArray(row.depositos) ? row.depositos[0] : row.depositos;
        if (!dep) return [];
        return [{
            id: dep.id,
            codigo: dep.codigo,
            nombre: dep.nombre,
            ubicacion: dep.ubicacion ?? "",
            cantidad_actual: Number(row.cantidad_actual ?? 0),
        }];
    });
}
