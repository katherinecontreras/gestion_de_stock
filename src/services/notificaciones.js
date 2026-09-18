import { createBrowserClient } from "@/lib/supabase";
import { formatNombreCompleto } from "@/utils/format";
import { labelAccionNotificacion, labelTablaNotificacion, textoSinActorNotificacion, } from "@/utils/notificaciones";
export const NOTIF_PAGE_SIZE = 25;

export async function notificarCambioEstadoFamiliaGrupo({ tabla, id, codigo, descripcion, estado }) {
    const supabase = createBrowserClient();
    const label = `${codigo.trim()} – ${descripcion.trim()}`;
    if (tabla === "familias" || tabla === "grupos") {
        const { error: rpcError } = await supabase.rpc("fn_notificar_cambio_estado_familia_grupo", {
            p_tabla: tabla,
            p_id: id,
            p_label: label,
            p_estado_nuevo: estado,
        });
        if (!rpcError)
            return;
    }

    const tipo = estado === "activo" ? "Reactivacion" : "Inhabilitacion";
    const { data: tipoRow, error: tipoError } = await supabase
        .from("tipos_notificacion")
        .select("id")
        .eq("tipo", tipo)
        .maybeSingle();
    if (tipoError)
        throw tipoError;
    if (!tipoRow) {
        throw new Error(`Falta el tipo de notificación “${tipo}” en la base. Pegá el SQL del chat (paso 1 y 2).`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    let responsableId = null;
    let actor = null;
    if (user) {
        const { data: resp } = await supabase
            .from("responsables")
            .select("id, nombre, apellido")
            .eq("auth_user_id", user.id)
            .maybeSingle();
        responsableId = resp?.id ?? null;
        actor = formatNombreCompleto(resp?.nombre, resp?.apellido);
    }

    let texto;
    if (tabla === "familias") {
        texto = estado === "activo"
            ? `Se reactivó la familia ${label}. Todos sus grupos también se reactivaron.`
            : `Se inhabilitó la familia ${label}. Todos sus grupos también se inhabilitaron.`;
    }
    else if (tabla === "proveedores") {
        texto = estado === "activo"
            ? `Se reactivó el proveedor ${label}.`
            : `Se inhabilitó el proveedor ${label}. Se desvinculó de los movimientos.`;
    }
    else if (tabla === "depositos") {
        texto = estado === "activo"
            ? `Se reactivó el depósito ${label}.`
            : `Se inhabilitó el depósito ${label}. Ya no se puede usar en movimientos nuevos. El historial se conserva.`;
    }
    else if (tabla === "articulos") {
        texto = estado === "activo"
            ? `Se reactivó el artículo ${label}.`
            : `Se inhabilitó el artículo ${label}. Ya no se puede usar en movimientos nuevos. El historial se conserva.`;
    }
    else {
        texto = estado === "activo"
            ? `Se reactivó el grupo ${label}.`
            : `Se inhabilitó el grupo ${label}.`;
    }
    if (actor)
        texto += ` · por ${actor}`;

    const { error: insertError } = await supabase.from("notificaciones").insert({
        id_tipo_notificacion: tipoRow.id,
        id_responsable: responsableId,
        tabla_afectada: tabla,
        id_valor_ajustado: id,
        descripcion: texto,
        metadata: { estado_nuevo: estado },
    });
    if (insertError)
        throw insertError;
}
const ACCION_TIPOS = {
    Creacion: ["Creacion"],
    Eliminacion: ["Eliminacion"],
    Modificacion: ["Modificacion"],
    Asignacion_Rol: ["Asignacion_Rol"],
    Asignacion_Responsable: ["Asignacion_Responsable"],
    Desvinculacion_Responsable: ["Desvinculacion_Responsable"],
    Invitacion: ["Invitacion"],
    Bienvenida: ["Bienvenida"],
    Recuperacion: ["Recuperacion_Contrasena", "Ingreso_Plataforma"],
    Carga_Movimiento: ["Carga_Movimiento"],
    Carga_Masiva: ["Carga_Masiva"],
    Reactivacion: ["Reactivacion"],
    Inhabilitacion: ["Inhabilitacion"],
    Alerta_Recambio_EPP: ["Alerta_Recambio_EPP"],
    Peticion_Depositos: ["Peticion_Depositos"],
};
const TABLA_VALORES = {
    responsables: ["responsables"],
    articulos: ["articulos"],
    tipos: ["familias", "grupos"],
    precios: ["costos_articulos"],
    depositos: ["depositos"],
    proveedores: ["proveedores"],
    movimientos: ["movimientos"],
};
function embedOne(value) {
    if (!value)
        return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}
function sanitizeSearch(value) {
    return value.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
}
export async function listNotificacionesHistorial(filtros, page) {
    const supabase = createBrowserClient();
    const tipos = ACCION_TIPOS[filtros.accion];
    const tablas = TABLA_VALORES[filtros.tabla];
    const tipoJoin = tipos ? "tipos_notificacion!inner" : "tipos_notificacion";
    const from = page * NOTIF_PAGE_SIZE;
    const to = from + NOTIF_PAGE_SIZE - 1;
    let query = supabase
        .from("notificaciones")
        .select(`id, fecha, descripcion, tabla_afectada, metadata, ${tipoJoin} ( tipo, descripcion ), responsables!id_responsable ( nombre, apellido )`, { count: "exact" })
        .order("fecha", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
    const search = sanitizeSearch(filtros.search);
    if (search) {
        query = query.ilike("descripcion", `%${search}%`);
    }
    if (tipos) {
        query = query.in("tipos_notificacion.tipo", tipos);
    }
    if (tablas) {
        query = query.in("tabla_afectada", tablas);
    }
    if (filtros.tipoMovimiento) {
        query = query.contains("metadata", {
            tipo: filtros.tipoMovimiento,
        });
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    const rows = (data ?? []).map((row) => {
        const tipo = embedOne(row.tipos_notificacion)?.tipo ?? null;
        const responsable = embedOne(row.responsables);
        const actor = formatNombreCompleto(responsable?.nombre, responsable?.apellido);
        const descripcion = textoSinActorNotificacion(row.descripcion, actor);
        return {
            id: row.id,
            fecha: row.fecha,
            accion: labelAccionNotificacion(tipo),
            tipo,
            tabla: labelTablaNotificacion(row.tabla_afectada),
            tablaRaw: row.tabla_afectada,
            responsable: actor,
            descripcion,
            metadata: row.metadata,
        };
    });
    return { rows, total: count ?? 0 };
}
