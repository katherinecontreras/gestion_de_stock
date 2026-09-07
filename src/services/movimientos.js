import { createBrowserClient } from "@/lib/supabase";
import { STORAGE_BUCKET_REMITOS } from "@/services/index";
import { errorText, explainMissingDbFunction } from "./db-errors";

export const MOVIMIENTOS_PAGE_SIZE = 50;
export const ARTICULOS_MOVIMIENTO_PAGE_SIZE = 50;

const MOVIMIENTO_LIST_SELECT = `
  id, fecha, nro_remito, motivo, es_devolucion, cant_total_articulos, tipo_entrega_epp, fecha_recambio,
  id_tipo, id_proveedor, id_empleado,
  tipos_movimiento ( id, tipo ),
  responsable:id_responsable ( id, nombre, apellido ),
  deposito_origen:id_deposito_origen ( id, codigo, nombre ),
  deposito_destino:id_deposito_destino ( id, codigo, nombre ),
  proveedor:id_proveedor ( id, cod_proveedor, razon_social ),
  empleado:id_empleado ( id, nombre, apellido, dni, email )
`;

const MOVIMIENTO_DETALLE_SELECT = `
  ${MOVIMIENTO_LIST_SELECT},
  fotos_remito,
  movimientos_articulos (
    id, cantidad, observacion, id_articulo,
    articulos:id_articulo (
      id, codigo, nombre, unidad_de_medida, is_epp,
      grupos:id_grupo ( codigo, descripcion, familias:id_familia ( codigo, descripcion ) )
    )
  )
`;

function sanitizeSearch(value) {
    return String(value ?? "").replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
}

function embedOne(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

function mapDeposito(row) {
    if (!row) return null;
    return { id: row.id, codigo: row.codigo, nombre: row.nombre };
}

function mapMovimiento(row) {
    const tipo = embedOne(row.tipos_movimiento);
    const responsable = embedOne(row.responsable);
    const empleado = embedOne(row.empleado);
    const proveedor = embedOne(row.proveedor);
    return {
        id: row.id,
        fecha: row.fecha,
        nro_remito: row.nro_remito,
        motivo: row.motivo ?? "",
        es_devolucion: Boolean(row.es_devolucion),
        cant_total_articulos: Number(row.cant_total_articulos ?? 0),
        tipo_entrega_epp: row.tipo_entrega_epp ?? null,
        fecha_recambio: row.fecha_recambio ?? null,
        fotos_remito: Array.isArray(row.fotos_remito) ? row.fotos_remito : [],
        id_tipo: row.id_tipo,
        tipo: tipo?.tipo ?? null,
        responsable: responsable
            ? {
                id: responsable.id,
                nombre: responsable.nombre,
                apellido: responsable.apellido,
                etiqueta: `${responsable.nombre ?? ""} ${responsable.apellido ?? ""}`.trim(),
            }
            : null,
        origen: mapDeposito(embedOne(row.deposito_origen)),
        destino: mapDeposito(embedOne(row.deposito_destino)),
        proveedor: proveedor
            ? {
                id: proveedor.id,
                etiqueta: `${proveedor.cod_proveedor} – ${proveedor.razon_social}`,
            }
            : null,
        empleado: empleado
            ? {
                id: empleado.id,
                nombre: empleado.nombre,
                apellido: empleado.apellido,
                dni: empleado.dni,
                email: empleado.email,
                etiqueta: `${empleado.nombre} ${empleado.apellido}`.trim(),
            }
            : null,
        articulos: (row.movimientos_articulos ?? []).map((linea) => {
            const art = embedOne(linea.articulos);
            const grupo = art ? embedOne(art.grupos) : null;
            const familia = grupo ? embedOne(grupo.familias) : null;
            return {
                id: linea.id,
                cantidad: Number(linea.cantidad ?? 0),
                observacion: linea.observacion ?? "",
                id_articulo: linea.id_articulo,
                codigo: art?.codigo ?? "",
                nombre: art?.nombre ?? "",
                unidad_de_medida: art?.unidad_de_medida ?? "",
                is_epp: art?.is_epp === true,
                grupo_codigo: grupo?.codigo ?? "",
                grupo_descripcion: grupo?.descripcion ?? "",
                familia_codigo: familia?.codigo ?? "",
                familia_descripcion: familia?.descripcion ?? "",
            };
        }),
    };
}

export function explainMovimientoError(errorOrMessage) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    if (/stock insuficiente/i.test(message)) {
        return "No hay stock suficiente en el depósito origen para uno de los artículos.";
    }
    if (/al menos un artículo/i.test(message)) {
        return "El movimiento tiene que incluir al menos un artículo.";
    }
    if (/foto del remito|foto de remito/i.test(message)) {
        return "Hay que adjuntar al menos una foto del remito.";
    }
    if (/número de remito/i.test(message)) {
        return "El número de remito es obligatorio.";
    }
    if (/deben ser EPP/i.test(message)) {
        return "En una entrega EPP solo se pueden mover artículos EPP.";
    }
    if (/rpc_listar_catalogo_articulos/i.test(message)) {
        return "Falta la función del catálogo de entrada. Pegá en el SQL Editor el ajuste de vistas del responsable.";
    }
    if (/tus depósitos/i.test(message)) {
        return message;
    }
    if (/PGRST202|rpc_crear_movimiento|Could not find the function/i.test(message)) {
        return "Falta la RPC de movimiento en la base. Revisá supabase/schema.sql y pegá la función rpc_crear_movimiento en el SQL Editor.";
    }
    if (/empleados/i.test(message) && (errorOrMessage?.code === "42501" || /permission denied|row-level security|403/i.test(message))) {
        return "No tenés permiso para buscar o cargar empleados. Pegá en el SQL Editor el ajuste de empleados.";
    }
    if (errorOrMessage?.code === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para cargar o ver este movimiento.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar el movimiento.");
}

export async function listTiposMovimiento() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("tipos_movimiento")
        .select("id, tipo, descripcion")
        .order("id", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function listProveedoresActivosOpciones() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("proveedores")
        .select("id, cod_proveedor, razon_social")
        .eq("estado", "activo")
        .order("cod_proveedor", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
        id: row.id,
        etiqueta: `${row.cod_proveedor} – ${row.razon_social}`,
    }));
}

export async function listDepositosActivosOpciones() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("depositos")
        .select("id, codigo, nombre, estado")
        .eq("estado", "activo")
        .order("codigo", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function listMisDepositosOpciones() {
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
        .select("depositos:id_deposito ( id, codigo, nombre, estado )")
        .eq("id_responsable", responsable.id);
    if (error) throw error;
    return (data ?? [])
        .map((row) => embedOne(row.depositos))
        .filter((dep) => dep && dep.estado === "activo");
}

async function idsPorBusqueda(supabase, term) {
    const [{ data: depositos }, { data: responsables }, empleadosRes] = await Promise.all([
        supabase.from("depositos").select("id").or(`nombre.ilike.%${term}%,codigo.ilike.%${term}%`),
        supabase.from("responsables").select("id").or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%`),
        supabase.from("empleados").select("id").or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%`),
    ]);
    return {
        depositos: (depositos ?? []).map((row) => row.id),
        responsables: (responsables ?? []).map((row) => row.id),
        empleados: empleadosRes.error ? [] : (empleadosRes.data ?? []).map((row) => row.id),
    };
}

export async function listMovimientosPagina({
    search = "",
    tipo = "",
    sort = { key: "fecha", dir: "desc" },
    page = 0,
    pageSize = MOVIMIENTOS_PAGE_SIZE,
} = {}) {
    const supabase = createBrowserClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const sortColumn = sort.key === "cant" ? "cant_total_articulos" : "fecha";
    let query = supabase
        .from("movimientos")
        .select(MOVIMIENTO_LIST_SELECT, { count: "exact" });

    if (tipo) {
        const { data: tipoRow, error: tipoError } = await supabase
            .from("tipos_movimiento")
            .select("id")
            .eq("tipo", tipo)
            .maybeSingle();
        if (tipoError) throw tipoError;
        if (!tipoRow) return { rows: [], total: 0 };
        query = query.eq("id_tipo", tipoRow.id);
    }

    const term = sanitizeSearch(search);
    if (term) {
        const ids = await idsPorBusqueda(supabase, term);
        const parts = [`nro_remito.ilike.%${term}%`, `motivo.ilike.%${term}%`];
        if (ids.responsables.length) parts.push(`id_responsable.in.(${ids.responsables.join(",")})`);
        if (ids.empleados.length) parts.push(`id_empleado.in.(${ids.empleados.join(",")})`);
        if (ids.depositos.length) {
            parts.push(`id_deposito_origen.in.(${ids.depositos.join(",")})`);
            parts.push(`id_deposito_destino.in.(${ids.depositos.join(",")})`);
        }
        query = query.or(parts.join(","));
    }

    const run = (builder) => builder
        .order(sortColumn, { ascending: sort.dir === "asc" })
        .order("id", { ascending: false })
        .range(from, to);
    let result = await run(query);
    if (result.error && /id_empleado|empleados|tipo_entrega_epp|fecha_recambio/i.test(result.error.message ?? "")) {
        let fallback = supabase
            .from("movimientos")
            .select(`
              id, fecha, nro_remito, motivo, es_devolucion, cant_total_articulos,
              id_tipo, id_proveedor,
              tipos_movimiento ( id, tipo ),
              responsable:id_responsable ( id, nombre, apellido ),
              deposito_origen:id_deposito_origen ( id, codigo, nombre ),
              deposito_destino:id_deposito_destino ( id, codigo, nombre ),
              proveedor:id_proveedor ( id, cod_proveedor, razon_social )
            `, { count: "exact" });
        if (tipo) fallback = fallback.eq("id_tipo", (await supabase.from("tipos_movimiento").select("id").eq("tipo", tipo).maybeSingle()).data?.id);
        if (term) {
            fallback = fallback.or(`nro_remito.ilike.%${term}%,motivo.ilike.%${term}%`);
        }
        result = await run(fallback);
    }
    if (result.error) throw result.error;
    return {
        rows: (result.data ?? []).map(mapMovimiento),
        total: result.count ?? 0,
    };
}

export async function listEntregasEpp() {
    const supabase = createBrowserClient();
    const { data: tipoRow, error: tipoError } = await supabase
        .from("tipos_movimiento")
        .select("id")
        .eq("tipo", "Entrega_EPP")
        .maybeSingle();
    if (tipoError) throw tipoError;
    if (!tipoRow) return [];
    const { data, error } = await supabase
        .from("movimientos")
        .select(MOVIMIENTO_DETALLE_SELECT)
        .eq("id_tipo", tipoRow.id)
        .order("fecha", { ascending: false })
        .limit(2000);
    if (error) throw error;
    return (data ?? []).map(mapMovimiento);
}

export function groupEntregasPorEmpleado(movimientos) {
    const groups = new Map();
    for (const mov of movimientos ?? []) {
        const empleado = mov.empleado;
        if (!empleado?.id) continue;
        if (!groups.has(empleado.id)) {
            groups.set(empleado.id, { empleado, entregas: [] });
        }
        groups.get(empleado.id).entregas.push(mov);
    }
    const rows = [...groups.values()].map((group) => {
        const entregas = [...group.entregas].sort((a, b) => {
            const byFecha = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            if (byFecha !== 0) return byFecha;
            return String(b.id).localeCompare(String(a.id));
        });
        return {
            empleado: group.empleado,
            entregas: entregas.map((mov) => ({
                ...mov,
                recambiado: entregas.some((other) => (
                    other.id !== mov.id
                    && new Date(other.fecha).getTime() > new Date(mov.fecha).getTime()
                )),
            })),
        };
    });
    return rows.sort((a, b) => {
        const byApellido = (a.empleado.apellido ?? "").localeCompare(b.empleado.apellido ?? "", "es");
        if (byApellido !== 0) return byApellido;
        return (a.empleado.nombre ?? "").localeCompare(b.empleado.nombre ?? "", "es");
    });
}

export async function getMovimiento(id) {
    const supabase = createBrowserClient();
    const first = await supabase
        .from("movimientos")
        .select(MOVIMIENTO_DETALLE_SELECT)
        .eq("id", id)
        .maybeSingle();
    if (!first.error) return first.data ? mapMovimiento(first.data) : null;
    if (!/id_empleado|empleados|tipo_entrega_epp|fecha_recambio/i.test(first.error.message ?? "")) {
        throw first.error;
    }
    const { data, error } = await supabase
        .from("movimientos")
        .select(`
          id, fecha, nro_remito, motivo, es_devolucion, cant_total_articulos, fotos_remito,
          id_tipo, id_proveedor,
          tipos_movimiento ( id, tipo ),
          responsable:id_responsable ( id, nombre, apellido ),
          deposito_origen:id_deposito_origen ( id, codigo, nombre ),
          deposito_destino:id_deposito_destino ( id, codigo, nombre ),
          proveedor:id_proveedor ( id, cod_proveedor, razon_social ),
          movimientos_articulos (
            id, cantidad, observacion, id_articulo,
            articulos:id_articulo (
              id, codigo, nombre, unidad_de_medida, is_epp,
              grupos:id_grupo ( codigo, descripcion, familias:id_familia ( codigo, descripcion ) )
            )
          )
        `)
        .eq("id", id)
        .maybeSingle();
    if (error) throw error;
    return data ? mapMovimiento(data) : null;
}

export async function listEmpleados(search = "") {
    const supabase = createBrowserClient();
    const term = sanitizeSearch(search);
    let query = supabase
        .from("empleados")
        .select("id, nombre, apellido, dni, email")
        .order("apellido", { ascending: true })
        .order("nombre", { ascending: true })
        .limit(30);
    if (term) {
        query = query.or(`nombre.ilike.%${term}%,apellido.ilike.%${term}%,dni.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

export async function createEmpleado({ nombre, apellido, dni, email }) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("empleados")
        .insert({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            dni: dni.trim(),
            email: email.trim(),
        })
        .select("id, nombre, apellido, dni, email")
        .single();
    if (error) {
        if (error.code === "23505") {
            throw new Error("Ya existe un empleado con ese DNI.");
        }
        throw error;
    }
    return data;
}

async function grupoIdsDeFamilia(supabase, idFamilia) {
    const { data, error } = await supabase
        .from("grupos")
        .select("id")
        .eq("id_familia", idFamilia);
    if (error) throw error;
    return (data ?? []).map((row) => row.id);
}

async function applyFiltroFamiliaGrupo(supabase, query, idFamilia, idGrupo) {
    if (idGrupo) return { empty: false, query: query.eq("id_grupo", idGrupo) };
    if (!idFamilia) return { empty: false, query };
    const ids = await grupoIdsDeFamilia(supabase, idFamilia);
    if (ids.length === 0) return { empty: true, query };
    return { empty: false, query: query.in("id_grupo", ids) };
}

async function listCatalogoArticulosEntrada(supabase, { term, soloEpp, from, to, idFamilia, idGrupo }) {
    const tieneFiltro = Boolean(idFamilia || idGrupo);
    if (!tieneFiltro) {
        const { data, error } = await supabase.rpc("rpc_listar_catalogo_articulos", {
            p_search: term,
            p_solo_epp: soloEpp,
            p_from: from,
            p_to: to,
        });
        if (!error) {
            const payload = data && typeof data === "object" ? data : { rows: [], total: 0 };
            return {
                rows: (payload.rows ?? []).map((row) => ({
                    id: row.id,
                    codigo: row.codigo,
                    nombre: row.nombre,
                    unidad_de_medida: row.unidad_de_medida,
                    is_epp: row.is_epp === true,
                    stock: null,
                    id_familia: row.id_familia ?? null,
                    id_grupo: row.id_grupo ?? null,
                    familia_codigo: row.familia_codigo ?? "",
                    familia_descripcion: row.familia_descripcion ?? "",
                    grupo_codigo: row.grupo_codigo ?? "",
                    grupo_descripcion: row.grupo_descripcion ?? "",
                })),
                total: Number(payload.total ?? 0),
            };
        }
    }

    let query = supabase
        .from("articulos")
        .select("id, codigo, nombre, unidad_de_medida, is_epp, id_grupo, grupos:id_grupo ( id, codigo, descripcion, id_familia, familias:id_familia ( id, codigo, descripcion ) )", { count: "exact" })
        .eq("estado", "activo");
    if (soloEpp) query = query.eq("is_epp", true);
    const filtered = await applyFiltroFamiliaGrupo(supabase, query, idFamilia, idGrupo);
    if (filtered.empty) return { rows: [], total: 0 };
    query = filtered.query;
    if (term) query = query.or(`nombre.ilike.%${term}%,codigo.ilike.%${term}%`);
    const fallback = await query.order("codigo", { ascending: true }).range(from, to);
    if (fallback.error) throw fallback.error;
    return {
        rows: (fallback.data ?? []).map((row) => mapArticuloPicker(row)),
        total: fallback.count ?? 0,
    };
}

function mapArticuloPicker(row, stock = null) {
    const grupo = embedOne(row.grupos);
    const familia = grupo ? embedOne(grupo.familias) : null;
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        unidad_de_medida: row.unidad_de_medida,
        is_epp: row.is_epp === true,
        stock,
        id_grupo: row.id_grupo ?? grupo?.id ?? null,
        id_familia: familia?.id ?? grupo?.id_familia ?? null,
        familia_codigo: familia?.codigo ?? "",
        familia_descripcion: familia?.descripcion ?? "",
        grupo_codigo: grupo?.codigo ?? "",
        grupo_descripcion: grupo?.descripcion ?? "",
    };
}

export async function listArticulosParaMovimiento({
    tipo,
    idDepositoOrigen,
    search = "",
    idFamilia = "",
    idGrupo = "",
    page = 0,
    pageSize = ARTICULOS_MOVIMIENTO_PAGE_SIZE,
} = {}) {
    const supabase = createBrowserClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const term = sanitizeSearch(search);
    const soloEpp = tipo === "Entrega_EPP";

    if (tipo === "Entrada") {
        return listCatalogoArticulosEntrada(supabase, { term, soloEpp, from, to, idFamilia, idGrupo });
    }

    if (!idDepositoOrigen) return { rows: [], total: 0 };

    let query = supabase
        .from("inventario_depositos")
        .select("cantidad_actual, articulos:id_articulo ( id, codigo, nombre, unidad_de_medida, is_epp, estado, id_grupo, grupos:id_grupo ( id, codigo, descripcion, id_familia, familias:id_familia ( id, codigo, descripcion ) ) )", { count: "exact" })
        .eq("id_deposito", idDepositoOrigen)
        .gt("cantidad_actual", 0);
    const { data, error, count } = await query
        .order("id")
        .range(0, 999);
    if (error) throw error;

    const mapped = (data ?? []).flatMap((row) => {
        const art = embedOne(row.articulos);
        if (!art || art.estado !== "activo") return [];
        if (soloEpp && art.is_epp !== true) return [];
        if (term) {
            const hay = `${art.codigo} ${art.nombre}`.toLowerCase().includes(term.toLowerCase());
            if (!hay) return [];
        }
        const mapped = mapArticuloPicker(art, Number(row.cantidad_actual ?? 0));
        if (idGrupo && mapped.id_grupo !== idGrupo) return [];
        if (!idGrupo && idFamilia && mapped.id_familia !== idFamilia) return [];
        return [mapped];
    });
    const total = mapped.length;
    return {
        rows: mapped.slice(from, to + 1),
        total,
        rawCount: count ?? mapped.length,
    };
}

export async function uploadFotosRemito(files) {
    const supabase = createBrowserClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("No hay sesión para subir el remito.");
    const paths = [];
    for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(STORAGE_BUCKET_REMITOS).upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "image/jpeg",
        });
        if (error) throw error;
        paths.push(path);
    }
    return paths;
}

export async function signedUrlsRemito(paths) {
    if (!paths?.length) return [];
    const supabase = createBrowserClient();
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET_REMITOS)
        .createSignedUrls(paths, 60 * 60);
    if (error) throw error;
    return (data ?? []).map((item, index) => ({
        path: paths[index],
        url: item.signedUrl ?? null,
    }));
}

export async function crearMovimiento(input) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_crear_movimiento", {
        p_payload: {
            id_tipo: Number(input.idTipo),
            id_deposito_origen: input.idDepositoOrigen || null,
            id_deposito_destino: input.idDepositoDestino || null,
            id_proveedor: input.idProveedor || null,
            es_devolucion: Boolean(input.esDevolucion),
            motivo: input.motivo?.trim() || null,
            nro_remito: input.nroRemito,
            fotos_remito: input.fotosRemito ?? [],
            articulos: input.articulos,
            tipo_entrega_epp: input.tipoEntregaEpp || null,
            id_empleado: input.idEmpleado || null,
        },
    });
    if (error) throw error;
    return data;
}
