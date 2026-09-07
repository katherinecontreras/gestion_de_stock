import { isEmailJsRecambioConfigured, sendAlertaRecambioEpp } from "@/lib/emailjs";
import { createBrowserClient } from "@/lib/supabase";
import { errorText, explainMissingDbFunction } from "./db-errors";

function formatFecha(value) {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("es-AR");
}

export async function procesarAlertasRecambio() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_procesar_alertas_recambio");
    if (error) {
        throw new Error(explainMissingDbFunction(
            errorText(error),
            "No se pudieron generar las alertas de recambio.",
        ));
    }
    const pendientes = Array.isArray(data?.pendientes) ? data.pendientes : [];
    if (pendientes.length === 0) {
        return { creadas: Number(data?.creadas ?? 0), enviadas: 0 };
    }
    if (!isEmailJsRecambioConfigured()) {
        return { creadas: Number(data?.creadas ?? 0), enviadas: 0, sinTemplate: true };
    }

    const enviados = [];
    for (const item of pendientes) {
        const fecha = formatFecha(item.fecha_recambio);
        const articulos = item.articulos || "artículos EPP";
        const deposito = item.deposito || "depósito";
        const empleado = item.empleado_nombre || "el empleado";
        try {
            if (item.empleado_email) {
                await sendAlertaRecambioEpp({
                    email: item.empleado_email,
                    empleado,
                    dni: item.dni || "",
                    deposito,
                    articulos,
                    fechaRecambio: fecha,
                });
            }
            if (item.responsable_email && item.responsable_email !== item.empleado_email) {
                await sendAlertaRecambioEpp({
                    email: item.responsable_email,
                    empleado,
                    dni: item.dni || "",
                    deposito,
                    articulos,
                    fechaRecambio: fecha,
                });
            }
            if (item.id_notificacion) enviados.push(item.id_notificacion);
        }
        catch {
            // El siguiente ingreso reintenta el mail; la notificación ya quedó en la campana.
        }
    }

    if (enviados.length > 0) {
        await supabase.rpc("rpc_marcar_alerta_recambio_enviada", { p_ids: enviados });
    }

    return {
        creadas: Number(data?.creadas ?? 0),
        enviadas: enviados.length,
    };
}
