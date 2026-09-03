import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { formatFamiliaGrupo, formatNombreCompleto } from "@/utils/format";
import { esAltaGruposFamilia, labelAccionNotificacion, textoSinActorNotificacion, } from "@/utils/notificaciones";
function relativeTime(iso) {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60_000));
    if (mins < 1)
        return "Ahora";
    if (mins < 60)
        return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1)
        return "Ayer";
    if (days < 7)
        return `Hace ${days} días`;
    return date.toLocaleDateString("es-AR");
}
function embedTipo(value) {
    if (!value)
        return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}
function embedResponsable(value) {
    if (!value)
        return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
}
function actorDeFila(row) {
    const responsable = embedResponsable(row.responsables);
    const desdeJoin = formatNombreCompleto(responsable?.nombre, responsable?.apellido);
    if (desdeJoin)
        return desdeJoin;
    const match = row.descripcion.match(/ · por (.+)$/);
    return match?.[1]?.trim() || null;
}
function textoSinActor(descripcion, actor) {
    return textoSinActorNotificacion(descripcion, actor);
}
function idsForTabla(rows, tabla) {
    return [
        ...new Set(rows
            .filter((row) => embedTipo(row.tipos_notificacion)?.tipo === "Creacion" &&
            row.tabla_afectada === tabla &&
            row.id_valor_ajustado)
            .map((row) => row.id_valor_ajustado)),
    ];
}
async function etiquetasCreacion(supabase, rows) {
    const labels = new Map();
    function remember(tabla, id, etiqueta) {
        labels.set(`${tabla}:${id}`, etiqueta);
    }
    const familiaIds = idsForTabla(rows, "familias");
    if (familiaIds.length > 0) {
        const { data } = await supabase
            .from("familias")
            .select("id, codigo, descripcion")
            .in("id", familiaIds);
        for (const row of data ?? []) {
            remember("familias", row.id, formatFamiliaGrupo(row.codigo, row.descripcion));
        }
    }
    const grupoIds = idsForTabla(rows, "grupos");
    if (grupoIds.length > 0) {
        const { data } = await supabase
            .from("grupos")
            .select("id, codigo, descripcion, familias ( codigo, descripcion )")
            .in("id", grupoIds);
        for (const row of data ?? []) {
            const familia = Array.isArray(row.familias) ? row.familias[0] : row.familias;
            const grupo = formatFamiliaGrupo(row.codigo, row.descripcion);
            const extra = familia?.codigo && familia.descripcion
                ? ` (familia ${formatFamiliaGrupo(familia.codigo, familia.descripcion)})`
                : "";
            remember("grupos", row.id, `${grupo}${extra}`);
        }
    }
    const proveedorIds = idsForTabla(rows, "proveedores");
    if (proveedorIds.length > 0) {
        const { data } = await supabase
            .from("proveedores")
            .select("id, cod_proveedor, razon_social")
            .in("id", proveedorIds);
        for (const row of data ?? []) {
            remember("proveedores", row.id, formatFamiliaGrupo(row.cod_proveedor, row.razon_social));
        }
    }
    const articuloIds = idsForTabla(rows, "articulos");
    if (articuloIds.length > 0) {
        const { data } = await supabase
            .from("articulos")
            .select("id, codigo, nombre")
            .in("id", articuloIds);
        for (const row of data ?? []) {
            remember("articulos", row.id, formatFamiliaGrupo(row.codigo, row.nombre));
        }
    }
    const depositoIds = idsForTabla(rows, "depositos");
    if (depositoIds.length > 0) {
        const { data } = await supabase
            .from("depositos")
            .select("id, codigo, nombre")
            .in("id", depositoIds);
        for (const row of data ?? []) {
            remember("depositos", row.id, formatFamiliaGrupo(row.codigo, row.nombre));
        }
    }
    return labels;
}
function cuerpoNotificacion(row, etiquetas, actor) {
    const base = textoSinActor(row.descripcion, actor);
    if (esAltaGruposFamilia(base)) {
        return base;
    }
    if (embedTipo(row.tipos_notificacion)?.tipo !== "Creacion") {
        return base;
    }
    if (!row.tabla_afectada || !row.id_valor_ajustado) {
        return base;
    }
    const etiqueta = etiquetas.get(`${row.tabla_afectada}:${row.id_valor_ajustado}`);
    if (!etiqueta)
        return base;
    return `Alta en ${row.tabla_afectada}: ${etiqueta}`;
}
export function useCampanaNotificaciones() {
    const [items, setItems] = useState([]);
    const [responsableId, setResponsableId] = useState(null);
    const [loading, setLoading] = useState(true);
    const loadSeq = useRef(0);
    const locallyReadIds = useRef(new Set());
    const itemsRef = useRef([]);
    const load = useCallback(async () => {
        if (!getSupabaseEnv().isConfigured) {
            setItems([]);
            setLoading(false);
            return;
        }
        const seq = ++loadSeq.current;
        const supabase = createBrowserClient();
        const { data: { session }, } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (!user) {
            if (seq !== loadSeq.current)
                return;
            setItems([]);
            setResponsableId(null);
            setLoading(false);
            return;
        }
        const { data: responsable } = await supabase
            .from("responsables")
            .select("id")
            .eq("auth_user_id", user.id)
            .eq("estado", "activo")
            .maybeSingle();
        const currentResponsableId = responsable?.id ?? null;
        const [{ data: rows }, { data: leidas }] = await Promise.all([
            supabase
                .from("notificaciones")
                .select("id, descripcion, fecha, tabla_afectada, id_valor_ajustado, tipos_notificacion ( tipo, descripcion ), responsables!id_responsable ( nombre, apellido )")
                .order("fecha", { ascending: false })
                .limit(40),
            currentResponsableId
                ? supabase
                    .from("notificaciones_leidas")
                    .select("id_notificacion")
                    .eq("id_responsable", currentResponsableId)
                : Promise.resolve({ data: [] }),
        ]);
        if (seq !== loadSeq.current)
            return;
        const notificaciones = (rows ?? []);
        const etiquetas = await etiquetasCreacion(supabase, notificaciones);
        if (seq !== loadSeq.current)
            return;
        const readIds = new Set((leidas ?? []).map((row) => row.id_notificacion));
        setResponsableId(currentResponsableId);
        const nextItems = notificaciones.map((row) => {
            const tipo = embedTipo(row.tipos_notificacion);
            const actor = actorDeFila(row);
            return {
                id: row.id,
                title: labelAccionNotificacion(tipo?.tipo),
                body: cuerpoNotificacion(row, etiquetas, actor),
                actor,
                time: relativeTime(row.fecha),
                fecha: row.fecha,
                read: readIds.has(row.id) || locallyReadIds.current.has(row.id),
            };
        });
        itemsRef.current = nextItems;
        setItems(nextItems);
        setLoading(false);
    }, []);
    useEffect(() => {
        void load();
        if (!getSupabaseEnv().isConfigured)
            return;
        const supabase = createBrowserClient();
        const channel = supabase.channel("campana-notificaciones");
        channel
            .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones" }, () => {
            void load();
        })
            .on("postgres_changes", { event: "*", schema: "public", table: "notificaciones_leidas" }, () => {
            void load();
        });
        async function connectRealtime() {
            const { data: { session }, } = await supabase.auth.getSession();
            if (session?.access_token) {
                await supabase.realtime.setAuth(session.access_token);
            }
            channel.subscribe();
        }
        void connectRealtime();
        const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.access_token) {
                void supabase.realtime.setAuth(session.access_token);
            }
            void load();
        });
        const onVisible = () => {
            if (document.visibilityState === "visible")
                void load();
        };
        const onFocus = () => {
            void load();
        };
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onFocus);
        const poll = window.setInterval(() => {
            void load();
        }, 8000);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onFocus);
            window.clearInterval(poll);
            auth.subscription.unsubscribe();
            void supabase.removeChannel(channel);
        };
    }, [load]);
    const markAllRead = useCallback(async () => {
        if (!responsableId)
            return;
        const unread = itemsRef.current.filter((item) => !item.read);
        if (unread.length === 0)
            return;
        unread.forEach((item) => locallyReadIds.current.add(item.id));
        const nextItems = itemsRef.current.map((item) => ({ ...item, read: true }));
        itemsRef.current = nextItems;
        setItems(nextItems);
        const supabase = createBrowserClient();
        await supabase.from("notificaciones_leidas").upsert(unread.map((item) => ({
            id_notificacion: item.id,
            id_responsable: responsableId,
        })), { onConflict: "id_notificacion,id_responsable" });
    }, [responsableId]);
    const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);
    return { items, unreadCount, loading, reload: load, markAllRead };
}
