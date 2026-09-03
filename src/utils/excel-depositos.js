import * as XLSX from "xlsx";
import { downloadExcelWorkbook } from "./excel";

export const DEPOSITOS_SHEET = "Depósitos";
export const DEPOSITOS_HEADERS = {
    codigo: "Código",
    nombre: "Nombre",
    ubicacion: "Ubicación",
};

function cellText(value) {
    if (value === null || value === undefined)
        return "";
    return String(value).trim();
}

function normalizeHeader(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "");
}

function isCodigoHeader(header) {
    const key = normalizeHeader(header);
    return key === "codigo" || key === "coddeposito" || key === "codigodeposito";
}

function isNombreHeader(header) {
    const key = normalizeHeader(header);
    return key === "nombre" || key === "deposito" || key === "descripcion";
}

function isUbicacionHeader(header) {
    const key = normalizeHeader(header);
    return key === "ubicacion" || key === "lugar" || key === "direccion";
}

export function downloadDepositosExcel(rows, filename = "depositos.xlsx") {
    const data = [
        [DEPOSITOS_HEADERS.codigo, DEPOSITOS_HEADERS.nombre, DEPOSITOS_HEADERS.ubicacion],
        ...rows.map((row) => [row.codigo, row.nombre, row.ubicacion]),
    ];
    downloadExcelWorkbook([{ name: DEPOSITOS_SHEET, rows: data }], filename);
}

export function parseDepositosExcel(file) {
    const workbook = XLSX.read(file, { type: "array" });
    const sheetName = workbook.SheetNames.includes(DEPOSITOS_SHEET)
        ? DEPOSITOS_SHEET
        : workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error("El Excel no tiene hojas.");
    }
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
    });
    if (matrix.length < 2) {
        throw new Error("El Excel no tiene filas de depósitos.");
    }
    const headers = (matrix[0] ?? []).map((cell) => cellText(cell));
    const codigoIndex = headers.findIndex(isCodigoHeader);
    const nombreIndex = headers.findIndex(isNombreHeader);
    const ubicacionIndex = headers.findIndex(isUbicacionHeader);
    if (codigoIndex < 0 || nombreIndex < 0 || ubicacionIndex < 0) {
        throw new Error("El Excel debe tener las columnas “Código”, “Nombre” y “Ubicación” (el mismo formato de la descarga).");
    }
    const seen = new Map();
    const rows = [];
    const errors = [];
    for (let index = 1; index < matrix.length; index += 1) {
        const excelRow = index + 1;
        const line = matrix[index] ?? [];
        const codigo = cellText(line[codigoIndex]);
        const nombre = cellText(line[nombreIndex]);
        const ubicacion = cellText(line[ubicacionIndex]);
        if (!codigo && !nombre && !ubicacion)
            continue;
        if (!codigo) {
            errors.push(`Fila ${excelRow}: falta el código (nombre “${nombre}”).`);
            continue;
        }
        if (!nombre) {
            errors.push(`Fila ${excelRow}: falta el nombre (código “${codigo}”).`);
            continue;
        }
        if (!ubicacion) {
            errors.push(`Fila ${excelRow}: falta la ubicación (código “${codigo}”).`);
            continue;
        }
        const key = codigo.toLowerCase();
        const previousRow = seen.get(key);
        if (previousRow) {
            errors.push(`Fila ${excelRow}: el código “${codigo}” está repetido (ya está en la fila ${previousRow}).`);
            continue;
        }
        seen.set(key, excelRow);
        rows.push({ codigo, nombre, ubicacion });
    }
    if (errors.length > 0) {
        const shown = errors.slice(0, 8);
        const extra = errors.length - shown.length;
        throw new Error(extra > 0
            ? `${shown.join(" ")} Y ${extra} error${extra === 1 ? "" : "es"} más.`
            : shown.join(" "));
    }
    if (rows.length === 0) {
        throw new Error("No hay depósitos para cargar en el Excel.");
    }
    return rows;
}
