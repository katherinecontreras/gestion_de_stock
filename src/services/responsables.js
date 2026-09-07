import { createBrowserClient } from "@/lib/supabase";
import { formatNombreCompleto } from "@/utils/format";
import { errorText, explainMissingDbFunction } from "./db-errors";

function embedOne(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}

export const ROL_OPCIONES = [
    { value: "Administrador", label: "Administrador" },
    { value: "Responsable_Deposito", label: "Responsable de depósito" },
    { value: "Vista_Descarga", label: "Vista y descarga" },
];

export function labelRolResponsable(tipo) {
    return ROL_OPCIONES.find((item) => item.value === tipo)?.label
        ?? String(tipo ?? "—").replaceAll("_", " ");
}

function mapDepositos(row) {
    const raw = Array.isArray(row.depositos_responsables) ? row.depositos_responsables : [];
    return raw
        .map((item) => {
            const dep = embedOne(item.depositos);
            return dep
                ? {
                    id: dep.id,
                    codigo: dep.codigo ?? "",
                    nombre: dep.nombre ?? "",
                    etiqueta: `${dep.codigo ?? ""} – ${dep.nombre ?? ""}`.trim(),
                }
                : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

function mapResponsable(row) {
    const rol = embedOne(row.roles);
    const depositos = mapDepositos(row);
    return {
        id: row.id,
        nombre: row.nombre ?? "",
        apellido: row.apellido ?? "",
        dni: row.dni ?? "",
        email: row.email ?? "",
        estado: row.estado === "inactivo" ? "inactivo" : "activo",
        rol: rol?.tipo ?? null,
        rolLabel: labelRolResponsable(rol?.tipo),
        depositos,
        depositoIds: depositos.map((item) => item.id),
        etiqueta: formatNombreCompleto(row.nombre, row.apellido) ?? "Sin nombre",
    };
}

export function explainResponsableError(errorOrMessage) {
    const message = typeof errorOrMessage === "string"
        ? errorOrMessage
        : errorText(errorOrMessage);
    const code = errorOrMessage?.code;
    if (code === "23505" || /duplicate key|unique/i.test(message)) {
        return "Ya hay un responsable con ese DNI o ese email.";
    }
    if (code === "23503" || /foreign key|historial/i.test(message)) {
        return message || "No se puede borrar: este responsable tiene historial. Inactivalo si no querés que entre.";
    }
    if (code === "42501" || /row-level security|permission denied/i.test(message)) {
        return "No tenés permiso para administrar responsables.";
    }
    return explainMissingDbFunction(message, message || "No se pudo completar la operación.");
}

export async function listResponsablesAdmin() {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
        .from("responsables")
        .select(`
          id, nombre, apellido, dni, email, estado,
          roles ( id, tipo ),
          depositos_responsables ( id_deposito, depositos:id_deposito ( id, codigo, nombre ) )
        `)
        .order("apellido", { ascending: true })
        .order("nombre", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapResponsable);
}

export async function actualizarResponsable(input) {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.rpc("rpc_actualizar_responsable", {
        p_id: input.id,
        p_nombre: input.nombre,
        p_apellido: input.apellido,
        p_dni: input.dni,
        p_rol: input.rol,
        p_estado: input.estado,
        p_depositos: input.rol === "Responsable_Deposito" ? (input.depositos ?? []) : [],
    });
    if (error) throw error;
    return data ?? {};
}

export async function eliminarResponsable(id) {
    const supabase = createBrowserClient();
    const { error } = await supabase.rpc("rpc_eliminar_responsable", { p_id: id });
    if (error) throw error;
}
