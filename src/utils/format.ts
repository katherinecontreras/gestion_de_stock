const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FORMATTER.format(date);
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return CURRENCY_FORMATTER.format(value);
}

export function formatFamiliaGrupo(codigo: string, descripcion: string) {
  return `${codigo} – ${descripcion}`;
}
