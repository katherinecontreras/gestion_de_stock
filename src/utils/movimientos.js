export const TIPO_MOVIMIENTO = {
    Entrada: "Entrada",
    Salida: "Salida",
    Transferencia: "Transferencia",
    Entrega_EPP: "Entrega_EPP",
};

export const TIPO_MOVIMIENTO_LABEL = {
    Entrada: "Entrada",
    Salida: "Salida",
    Transferencia: "Transferencia",
    Entrega_EPP: "Entrega EPP",
};

export const TIPO_MOVIMIENTO_TONE = {
    Entrada: "ok",
    Salida: "warning",
    Transferencia: "info",
    Entrega_EPP: "trip",
};

export const TIPO_ENTREGA_EPP = {
    Ingreso: "Ingreso",
    Recambio_Rotura: "Recambio por rotura",
    Recambio_Talle: "Recambio por talle",
};

export function labelTipoMovimiento(tipo) {
    return TIPO_MOVIMIENTO_LABEL[tipo] ?? String(tipo ?? "Movimiento").replaceAll("_", " ");
}

export function toneTipoMovimiento(tipo) {
    return TIPO_MOVIMIENTO_TONE[tipo] ?? "neutral";
}

export function labelTipoEntregaEpp(tipo) {
    if (!tipo) return null;
    return TIPO_ENTREGA_EPP[tipo] ?? String(tipo).replaceAll("_", " ");
}

export function formatDepositosMovimiento(tipo, origen, destino) {
    const label = (dep) => (dep ? `${dep.codigo} – ${dep.nombre}` : null);
    if (tipo === "Entrada") return label(destino) ?? "—";
    const parts = [label(origen), label(destino)].filter(Boolean);
    return parts.length ? parts.join(" / ") : "—";
}

export function recambioEstado(fechaRecambio, recambiado) {
    if (recambiado) return "Ya fue recambiado";
    if (!fechaRecambio) return null;
    const due = new Date(`${fechaRecambio}T00:00:00`);
    if (Number.isNaN(due.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due > today) return "Recambio pendiente";
    return "Debe recambiarse";
}

export function embedOne(value) {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}
