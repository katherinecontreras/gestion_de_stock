export function errorText(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ");
}

export function explainMissingDbFunction(message, fallback) {
  const text = message ?? "";
  if (/PGRST202|Could not find the function/i.test(text)) {
    return "Falta una función en la base. Pegá en el SQL Editor el ajuste que te pasé en el chat.";
  }
  if (/PGRST205|Could not find the table/i.test(text)) {
    return "La API no ve las tablas (faltan GRANT). Pegá en el SQL Editor el ajuste que te pasé en el chat.";
  }
  if (/fn_etiqueta_maestro/i.test(text)) {
    return "Falta fn_etiqueta_maestro en la base. Pegá en el SQL Editor el ajuste que te pasé en el chat.";
  }
  if (/does not exist/i.test(text) || /42883/.test(text)) {
    return "Falta una función en la base. Pegá en el SQL Editor el ajuste que te pasé en el chat.";
  }
  if (/schema cache/i.test(text)) {
    return "La API no ve una tabla o función. Pegá el SQL del chat y recargá.";
  }
  return fallback;
}
