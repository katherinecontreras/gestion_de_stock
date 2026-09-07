const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
});
const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
});
const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
});
export function formatDateTime(value) {
    if (!value)
        return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return "—";
    return DATE_FORMATTER.format(date);
}
export function formatDate(value) {
    if (!value)
        return "—";
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime()))
        return "—";
    return DATE_ONLY_FORMATTER.format(date);
}
export function formatCurrency(value) {
    if (value === null || value === undefined)
        return "—";
    return CURRENCY_FORMATTER.format(value);
}
export function formatFamiliaGrupo(codigo, descripcion) {
    return `${codigo} – ${descripcion}`;
}
export function formatNombreCompleto(nombre, apellido) {
    const full = [nombre, apellido]
        .map((part) => part?.trim())
        .filter((part) => Boolean(part))
        .join(" ");
    return full || null;
}
