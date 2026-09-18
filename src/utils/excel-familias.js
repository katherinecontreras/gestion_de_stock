import * as XLSX from "xlsx";
import { downloadExcelWorkbook, excelColumnLetter } from "./excel";
export const FAMILIAS_SHEET = "Familias";
export const FAMILIAS_HEADERS = {
    codigo: "Código",
    descripcion: "Descripción",
    cantGrupos: "Cant. grupos",
};
const SHEET_START_COL = 0;
const GRUPOS_START_COL = 0;
const HEADER_ROWS = 2;
const CODIGO_COL_WIDTH = 12;
const DESCRIPCION_COL_WIDTH = 52;
const CANT_GRUPOS_COL_WIDTH = 14;
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
    return key === "codigo" || key === "codfamilia" || key === "codgrupo";
}
function isDescripcionHeader(header) {
    const key = normalizeHeader(header);
    return key === "descripcion" || key === "nombre" || key === "familia" || key === "grupo";
}
function quoteSheetName(name) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        return name;
    return `'${name.replace(/'/g, "''")}'`;
}
export { quoteSheetName };
export function excelSheetName(codigo, used) {
    const cleaned = codigo.replace(/[:\\/?*[\]]/g, "-").trim() || "Familia";
    let base = cleaned.slice(0, 31);
    if (normalizeHeader(base) === "familias") {
        base = `Fam-${base}`.slice(0, 31);
    }
    let name = base;
    let n = 2;
    while (used.has(name.toLowerCase())) {
        const suffix = `-${n}`;
        name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
        n += 1;
    }
    used.add(name.toLowerCase());
    return name;
}
export function downloadFamiliasExcel(familias, filename = "familias-grupos.xlsx") {
    const used = new Set([FAMILIAS_SHEET.toLowerCase()]);
    const named = familias.map((familia) => ({
        familia,
        sheetName: excelSheetName(familia.codigo, used),
    }));
    const codigoCol = excelColumnLetter(SHEET_START_COL);
    const descCol = excelColumnLetter(SHEET_START_COL + 1);
    const gruposCol = excelColumnLetter(GRUPOS_START_COL);
    const gruposFirstRow = HEADER_ROWS + 1;
    const sheets = [
        {
            name: FAMILIAS_SHEET,
            startCol: SHEET_START_COL,
            freezeRows: HEADER_ROWS,
            mergeHeaderRows: HEADER_ROWS,
            autoFilterStartRow: HEADER_ROWS - 1,
            columnWidths: [CODIGO_COL_WIDTH, DESCRIPCION_COL_WIDTH, CANT_GRUPOS_COL_WIDTH],
            rows: [
                [
                    FAMILIAS_HEADERS.codigo,
                    FAMILIAS_HEADERS.descripcion,
                    FAMILIAS_HEADERS.cantGrupos,
                ],
                ...named.map(({ familia, sheetName }) => [
                    familia.codigo,
                    familia.descripcion,
                    {
                        v: familia.grupos.length,
                        f: `COUNTA(${quoteSheetName(sheetName)}!${gruposCol}${gruposFirstRow}:${gruposCol}1048576)`,
                    },
                ]),
            ],
        },
    ];
    named.forEach(({ familia, sheetName }, index) => {
        const excelRow = index + HEADER_ROWS + 1;
        const codigoRef = `${quoteSheetName(FAMILIAS_SHEET)}!${codigoCol}${excelRow}`;
        const descRef = `${quoteSheetName(FAMILIAS_SHEET)}!${descCol}${excelRow}`;
        sheets.push({
            name: sheetName,
            startCol: GRUPOS_START_COL,
            freezeRows: HEADER_ROWS,
            autoFilterStartRow: HEADER_ROWS - 1,
            columnWidths: [CODIGO_COL_WIDTH, DESCRIPCION_COL_WIDTH],
            merges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 1 }],
            rows: [
                [
                    {
                        v: `${familia.codigo} – ${familia.descripcion}`,
                        f: `${codigoRef}&" – "&${descRef}`,
                        header: true,
                    },
                    { v: "", header: true },
                ],
                [
                    { v: FAMILIAS_HEADERS.codigo, header: true },
                    { v: FAMILIAS_HEADERS.descripcion, header: true },
                ],
                ...familia.grupos.map((grupo) => [grupo.codigo, grupo.descripcion]),
            ],
        });
    });
    downloadExcelWorkbook(sheets, filename);
}
function sheetMatrix(sheet) {
    return XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
    });
}
function findTableHeader(matrix) {
    for (let index = matrix.length - 1; index >= 0; index -= 1) {
        const line = matrix[index] ?? [];
        for (let col = 0; col < line.length; col += 1) {
            const first = cellText(line[col]);
            const second = cellText(line[col + 1]);
            if (isCodigoHeader(first) && isDescripcionHeader(second)) {
                return { index, col };
            }
        }
    }
    return null;
}
export function parseFamiliasExcel(file) {
    const workbook = XLSX.read(file, { type: "array" });
    if (workbook.SheetNames.length === 0) {
        throw new Error("El Excel no tiene hojas.");
    }
    const familiasSheetName = workbook.SheetNames.find((name) => normalizeHeader(name) === "familias");
    const familiaCodes = new Set();
    if (familiasSheetName) {
        const matrix = sheetMatrix(workbook.Sheets[familiasSheetName]);
        const header = findTableHeader(matrix);
        const start = header ? header.index + 1 : 1;
        const codigoCol = header?.col ?? 0;
        for (let index = start; index < matrix.length; index += 1) {
            const codigo = cellText(matrix[index]?.[codigoCol]);
            if (codigo)
                familiaCodes.add(codigo.toLowerCase());
        }
    }
    const rows = [];
    const seen = new Map();
    const errors = [];
    for (const sheetName of workbook.SheetNames) {
        if (normalizeHeader(sheetName) === "familias")
            continue;
        const matrix = sheetMatrix(workbook.Sheets[sheetName]);
        if (matrix.length === 0)
            continue;
        const header = findTableHeader(matrix);
        if (!header) {
            errors.push(`Hoja “${sheetName}”: no se encontró la tabla de grupos (Código y Descripción).`);
            continue;
        }
        const { index: headerIndex, col } = header;
        let familiaCodigo = cellText(matrix[0]?.[col]);
        if (!familiaCodigo || isCodigoHeader(familiaCodigo) || isDescripcionHeader(familiaCodigo)) {
            familiaCodigo = cellText(matrix[0]?.[col + 1]);
        }
        const dash = familiaCodigo.indexOf(" – ");
        if (dash > 0) {
            familiaCodigo = familiaCodigo.slice(0, dash).trim();
        }
        if (!familiaCodigo || isCodigoHeader(familiaCodigo) || isDescripcionHeader(familiaCodigo)) {
            familiaCodigo = sheetName;
        }
        if (familiaCodes.size > 0 && !familiaCodes.has(familiaCodigo.toLowerCase())) {
            const match = [...familiaCodes].find((code) => code === sheetName.toLowerCase());
            if (match)
                familiaCodigo = match;
        }
        if (!familiaCodigo) {
            errors.push(`Hoja “${sheetName}”: no se pudo identificar la familia.`);
            continue;
        }
        for (let index = headerIndex + 1; index < matrix.length; index += 1) {
            const excelRow = index + 1;
            const codigo = cellText(matrix[index]?.[col]);
            const descripcion = cellText(matrix[index]?.[col + 1]);
            if (!codigo && !descripcion)
                continue;
            if (!codigo) {
                errors.push(`Hoja “${sheetName}”, fila ${excelRow}: falta el código del grupo.`);
                continue;
            }
            if (!descripcion) {
                errors.push(`Hoja “${sheetName}”, fila ${excelRow}: falta la descripción del grupo (código “${codigo}”).`);
                continue;
            }
            const key = `${familiaCodigo.toLowerCase()}:${codigo.toLowerCase()}`;
            const previous = seen.get(key);
            if (previous) {
                errors.push(`Hoja “${sheetName}”, fila ${excelRow}: el código “${codigo}” está repetido (ya está en ${previous.sheet}, fila ${previous.excelRow}).`);
                continue;
            }
            seen.set(key, { sheet: sheetName, excelRow });
            rows.push({
                familia_codigo: familiaCodigo,
                codigo,
                descripcion,
                excelRow,
                sheet: sheetName,
            });
        }
    }
    if (errors.length > 0) {
        const shown = errors.slice(0, 8);
        const extra = errors.length - shown.length;
        throw new Error(extra > 0
            ? `${shown.join(" ")} Y ${extra} error${extra === 1 ? "" : "es"} más.`
            : shown.join(" "));
    }
    if (rows.length === 0) {
        throw new Error("No hay grupos para cargar en el Excel.");
    }
    return rows;
}
