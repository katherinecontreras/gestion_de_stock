import * as XLSX from "xlsx";
import { downloadExcelWorkbook } from "./excel";

export const ARTICULOS_SHEET = "Artículos";
export const ARTICULOS_HEADERS = [
    "FAMILIA",
    "NOM_FAM",
    "GRUPO",
    "NOM_GRU",
    "COD_ARTIC",
    "DESCRIP",
    "UNIDADMED",
    "IS_EPP",
];

function cellText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function normalizeHeader(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "");
}

function parseEpp(value) {
    if (value === true || value === 1) return true;
    const raw = cellText(value);
    if (!raw) return false;
    const key = normalizeHeader(raw);
    if (key === "x" || key === "si" || key === "true" || key === "1" || key === "epp" || key === "yes") {
        return true;
    }
    return /^[x×✕]$/i.test(raw);
}

function eppLabel(value) {
    return value ? "X" : "";
}

function mapRow(row, extra = []) {
    return [
        row.familia_codigo ?? "",
        row.familia_descripcion ?? "",
        row.grupo_codigo ?? "",
        row.grupo_descripcion ?? "",
        row.codigo,
        row.nombre,
        row.unidad_de_medida,
        eppLabel(row.is_epp),
        ...extra,
    ];
}

export function downloadArticulosExcel(rows, filename = "articulos.xlsx", extraHeaders = []) {
    const headers = extraHeaders.length
        ? [...ARTICULOS_HEADERS, ...extraHeaders]
        : ARTICULOS_HEADERS;
    const data = [
        headers,
        ...rows.map((row) => {
            const extra = extraHeaders.includes("CANTIDAD")
                ? [row.cantidad_actual ?? 0]
                : [];
            return mapRow(row, extra);
        }),
    ];
    downloadExcelWorkbook([{ name: ARTICULOS_SHEET, rows: data }], filename);
}

export function parseArticulosExcel(file) {
    const workbook = XLSX.read(file, { type: "array" });
    const sheetName = workbook.SheetNames.includes(ARTICULOS_SHEET)
        ? ARTICULOS_SHEET
        : workbook.SheetNames[0];
    if (!sheetName) throw new Error("El Excel no tiene hojas.");
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
    });
    if (matrix.length < 2) {
        throw new Error("El Excel no tiene filas de artículos.");
    }
    const headers = (matrix[0] ?? []).map((cell) => normalizeHeader(cellText(cell)));
    const idx = (names) => {
        for (const name of names) {
            const found = headers.findIndex((header) => header === name);
            if (found >= 0) return found;
        }
        return -1;
    };
    const codigoIndex = idx(["codartic", "codigoarticulo", "codarticulo", "codigo"]);
    const nombreIndex = idx(["descrip", "descripcion", "nombre"]);
    const unidadIndex = idx(["unidadmed", "unidaddemedida", "unidadmedida", "unidad"]);
    const famIndex = idx(["familia", "codigofamilia"]);
    const gruIndex = idx(["grupo", "codigogrupo"]);
    const eppIndex = idx(["isepp", "esepp", "epp"]);

    if (codigoIndex < 0 || nombreIndex < 0 || unidadIndex < 0) {
        throw new Error("El Excel debe tener las columnas COD_ARTIC, DESCRIP y UNIDADMED (el mismo formato de la descarga).");
    }

    const seen = new Map();
    const rows = [];
    const errors = [];

    for (let index = 1; index < matrix.length; index += 1) {
        const excelRow = index + 1;
        const line = matrix[index] ?? [];
        const codigo = cellText(line[codigoIndex]);
        const nombre = cellText(line[nombreIndex]);
        const unidad_de_medida = cellText(line[unidadIndex]);
        const familia_codigo = famIndex >= 0 ? cellText(line[famIndex]) : "";
        const grupo_codigo = gruIndex >= 0 ? cellText(line[gruIndex]) : "";
        if (!codigo && !nombre && !unidad_de_medida) continue;
        if (!codigo || !nombre || !unidad_de_medida) {
            errors.push(`Fila ${excelRow}: faltan COD_ARTIC, DESCRIP o UNIDADMED.`);
            continue;
        }
        const key = codigo.toLowerCase();
        if (seen.has(key)) {
            errors.push(`Fila ${excelRow}: el código “${codigo}” está repetido en el archivo (fila ${seen.get(key)}).`);
            continue;
        }
        seen.set(key, excelRow);
        rows.push({
            codigo,
            nombre,
            unidad_de_medida,
            familia_codigo,
            grupo_codigo,
            is_epp: eppIndex >= 0 ? parseEpp(line[eppIndex]) : false,
        });
    }

    if (errors.length) throw new Error(errors.join(" "));
    if (!rows.length) throw new Error("El Excel no tiene artículos válidos.");
    return rows;
}
