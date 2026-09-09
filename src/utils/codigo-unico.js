export function mensajeCodigoOcupado({
    codigo,
    entidad,
    nombre,
    lugar,
    inactivo = false,
    alcance = "único",
}) {
    const code = String(codigo ?? "").trim();
    const titulo = String(nombre ?? "").trim() || "sin nombre";
    const extra = [lugar, inactivo ? "inactivo" : null].filter(Boolean).join(", ");
    const donde = extra ? ` (${extra})` : "";
    return `El código “${code}” ya está en ${entidad} “${titulo}”${donde}. El código tiene que ser ${alcance}.`;
}

export function hintCodigoUnico(alcance = "único") {
    return `El código tiene que ser ${alcance}. Si ya existe, se indica en qué registro está.`;
}

export function lugarFamiliaGrupo(codigo, descripcion, tipo) {
    if (!codigo) return "";
    return `${tipo} ${codigo} – ${descripcion || "sin nombre"}`;
}

export function mensajeFamiliaCodigoOcupado(row, codigo) {
    return mensajeCodigoOcupado({
        codigo: codigo ?? row?.codigo,
        entidad: "la familia",
        nombre: row?.descripcion,
        inactivo: row?.estado === "inactivo",
    });
}

export function mensajeGrupoCodigoOcupado(row, codigo) {
    const lugar = row?.familia_codigo
        ? lugarFamiliaGrupo(row.familia_codigo, row.familia_descripcion, "familia")
        : "";
    return mensajeCodigoOcupado({
        codigo: codigo ?? row?.codigo,
        entidad: "el grupo",
        nombre: row?.descripcion,
        lugar,
        inactivo: row?.estado === "inactivo",
        alcance: "único en esta familia",
    });
}

export function mensajeArticuloCodigoOcupado(row, codigo) {
    const partes = [
        lugarFamiliaGrupo(row?.familia_codigo, row?.familia_descripcion, "familia"),
        lugarFamiliaGrupo(row?.grupo_codigo, row?.grupo_descripcion, "grupo"),
    ].filter(Boolean);
    return mensajeCodigoOcupado({
        codigo: codigo ?? row?.codigo,
        entidad: "el artículo",
        nombre: row?.nombre,
        lugar: partes.join(" / "),
        inactivo: row?.estado === "inactivo",
    });
}
