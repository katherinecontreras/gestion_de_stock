import * as XLSX from "xlsx";
import { downloadExcelWorkbook } from "./excel";
export const PROVEEDORES_SHEET = "Proveedores";
export const PROVEEDORES_HEADERS = {
    codigo: "Código",
    razonSocial: "Razón social",
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
    return key === "codigo" || key === "codproveedor" || key === "codigoproveedor";
}
function isRazonHeader(header) {
    const key = normalizeHeader(header);
    return (key === "razonsocial" ||
        key === "razon" ||
        key === "nombre" ||
        key === "proveedor");
}
export function downloadProveedoresExcel(rows, filename = "proveedores.xlsx") {
    const data = [
        [PROVEEDORES_HEADERS.codigo, PROVEEDORES_HEADERS.razonSocial],
        ...rows.map((row) => [row.cod_proveedor, row.razon_social]),
    ];
    downloadExcelWorkbook([{ name: PROVEEDORES_SHEET, rows: data }], filename);
}
export function parseProveedoresExcel(file) {
    const workbook = XLSX.read(file, { type: "array" });
    const sheetName = workbook.SheetNames.includes(PROVEEDORES_SHEET)
        ? PROVEEDORES_SHEET
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
        throw new Error("El Excel no tiene filas de proveedores.");
    }
    const headers = (matrix[0] ?? []).map((cell) => cellText(cell));
    const codigoIndex = headers.findIndex(isCodigoHeader);
    const razonIndex = headers.findIndex(isRazonHeader);
    if (codigoIndex < 0 || razonIndex < 0) {
        throw new Error("El Excel debe tener las columnas “Código” y “Razón social” (el mismo formato de la descarga).");
    }
    const seen = new Map();
    const rows = [];
    const errors = [];
    for (let index = 1; index < matrix.length; index += 1) {
        const excelRow = index + 1;
        const line = matrix[index] ?? [];
        const cod_proveedor = cellText(line[codigoIndex]);
        const razon_social = cellText(line[razonIndex]);
        if (!cod_proveedor && !razon_social)
            continue;
        if (!cod_proveedor) {
            errors.push(`Fila ${excelRow}: falta el código (razón social “${razon_social}”).`);
            continue;
        }
        if (!razon_social) {
            errors.push(`Fila ${excelRow}: falta la razón social (código “${cod_proveedor}”).`);
            continue;
        }
        const key = cod_proveedor.toLowerCase();
        const previousRow = seen.get(key);
        if (previousRow) {
            errors.push(`Fila ${excelRow}: el código “${cod_proveedor}” está repetido (ya está en la fila ${previousRow}).`);
            continue;
        }
        seen.set(key, excelRow);
        rows.push({ cod_proveedor, razon_social });
    }
    if (errors.length > 0) {
        const shown = errors.slice(0, 8);
        const extra = errors.length - shown.length;
        throw new Error(extra > 0
            ? `${shown.join(" ")} Y ${extra} error${extra === 1 ? "" : "es"} más.`
            : shown.join(" "));
    }
    if (rows.length === 0) {
        throw new Error("No hay proveedores para cargar en el Excel.");
    }
    return rows;
}
