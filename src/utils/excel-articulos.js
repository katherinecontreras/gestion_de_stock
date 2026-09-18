import * as XLSX from "xlsx";
import { downloadExcelWorkbook, excelColumnLetter } from "./excel";
import { FAMILIAS_SHEET, excelSheetName, quoteSheetName } from "./excel-familias";

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
export const ARTICULOS_FAMILIA_HEADERS = {
    codigo: "Código",
    descripcion: "Descripción",
    cantGrupos: "Cant. grupos",
    cantArticulos: "Cant. artículos",
};
const SIN_FAMILIA_CODIGO = "Sin-familia";
const HEADER_ROWS = 2;
const COL = {
    grupo: 0,
    nomGrupo: 1,
    codigo: 2,
    nombre: 3,
    unidad: 4,
    epp: 5,
};

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

function familiaCodigoDeTitulo(value) {
    const text = cellText(value);
    if (!text) return "";
    const dash = text.indexOf(" – ");
    if (dash > 0) return text.slice(0, dash).trim();
    return text;
}

function headerIndex(headers, names) {
    for (const name of names) {
        const found = headers.findIndex((header) => header === name);
        if (found >= 0) return found;
    }
    return -1;
}

function findArticuloHeader(matrix) {
    for (let index = 0; index < matrix.length; index += 1) {
        const headers = (matrix[index] ?? []).map((cell) => normalizeHeader(cellText(cell)));
        const codigoIndex = headerIndex(headers, ["codartic", "codigoarticulo", "codarticulo", "codigo"]);
        const nombreIndex = headerIndex(headers, ["descrip", "descripcion", "nombre"]);
        const unidadIndex = headerIndex(headers, ["unidadmed", "unidaddemedida", "unidadmedida", "unidad"]);
        if (codigoIndex < 0 || nombreIndex < 0 || unidadIndex < 0) continue;
        if (nombreIndex === codigoIndex) continue;
        return {
            index,
            codigoIndex,
            nombreIndex,
            unidadIndex,
            famIndex: headerIndex(headers, ["familia", "codigofamilia"]),
            gruIndex: headerIndex(headers, ["grupo", "codigogrupo"]),
            gruNomIndex: headerIndex(headers, ["nomgru", "nombregrupo", "descgrupo"]),
            eppIndex: headerIndex(headers, ["isepp", "esepp", "epp"]),
        };
    }
    return null;
}

function parseArticulosMatrix(matrix, { sheetName, familiaCodigo = "" } = {}) {
    const header = findArticuloHeader(matrix);
    if (!header) return { rows: [], errors: [] };
    const seen = new Map();
    const rows = [];
    const errors = [];
    const tituloFamilia = familiaCodigoDeTitulo(matrix[0]?.[0]);
    const familiaHoja = familiaCodigo
        || (tituloFamilia && normalizeHeader(tituloFamilia) !== "familia" ? tituloFamilia : "")
        || (normalizeHeader(sheetName) === "sinfamilia" ? "" : sheetName);

    for (let index = header.index + 1; index < matrix.length; index += 1) {
        const excelRow = index + 1;
        const line = matrix[index] ?? [];
        const codigo = cellText(line[header.codigoIndex]);
        const nombre = cellText(line[header.nombreIndex]);
        const unidad_de_medida = cellText(line[header.unidadIndex]);
        const familia = header.famIndex >= 0 ? cellText(line[header.famIndex]) : familiaHoja;
        const grupo_codigo = header.gruIndex >= 0 ? cellText(line[header.gruIndex]) : "";
        if (!codigo && !nombre && !unidad_de_medida) continue;
        if (!codigo || !nombre || !unidad_de_medida) {
            errors.push(`Hoja “${sheetName}”, fila ${excelRow}: faltan COD_ARTIC, DESCRIP o UNIDADMED.`);
            continue;
        }
        if (Boolean(familia) !== Boolean(grupo_codigo)) {
            errors.push(`Hoja “${sheetName}”, fila ${excelRow}: el artículo “${codigo}” necesita familia y grupo, o ninguno de los dos.`);
            continue;
        }
        const key = codigo.toLowerCase();
        if (seen.has(key)) {
            errors.push(`Hoja “${sheetName}”, fila ${excelRow}: el código “${codigo}” está repetido (fila ${seen.get(key)}).`);
            continue;
        }
        seen.set(key, excelRow);
        rows.push({
            codigo,
            nombre,
            unidad_de_medida,
            familia_codigo: familia,
            grupo_codigo,
            is_epp: header.eppIndex >= 0 ? parseEpp(line[header.eppIndex]) : false,
            sheet: sheetName,
            excelRow,
        });
    }
    return { rows, errors };
}

export function excelSheetLabel(codigo, descripcion, used = new Set()) {
    const label = [String(codigo ?? "").trim(), String(descripcion ?? "").trim()].filter(Boolean).join(" – ");
    return excelSheetName(label || "Hoja", used);
}

export function downloadArticulosExcel(rows, filename = "articulos.xlsx", extraHeaders = [], sheetName = ARTICULOS_SHEET) {
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
    downloadExcelWorkbook([{ name: excelSheetName(sheetName, new Set()), rows: data }], filename);
}

export function downloadArticulosPorFamiliasExcel({ familias = [], articulos = [] }, filename = "articulos-familias.xlsx") {
    const byFamilia = new Map();
    const sinFamilia = [];
    for (const row of articulos) {
        const codigo = String(row.familia_codigo ?? "").trim();
        if (!codigo) {
            sinFamilia.push(row);
            continue;
        }
        const list = byFamilia.get(codigo.toLowerCase()) ?? [];
        list.push(row);
        byFamilia.set(codigo.toLowerCase(), list);
    }

    const resumen = [...familias]
        .map((familia) => ({
            codigo: familia.codigo,
            descripcion: familia.descripcion ?? "",
            articulos: byFamilia.get(String(familia.codigo).toLowerCase()) ?? [],
        }))
        .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es", { numeric: true }));

    for (const [key, rows] of byFamilia.entries()) {
        if (resumen.some((familia) => String(familia.codigo).toLowerCase() === key)) continue;
        const first = rows[0];
        resumen.push({
            codigo: first?.familia_codigo || key,
            descripcion: first?.familia_descripcion ?? "",
            articulos: rows,
        });
    }

    const used = new Set([FAMILIAS_SHEET.toLowerCase()]);
    const named = resumen.map((familia) => ({
        ...familia,
        sheetName: excelSheetName(String(familia.codigo), used),
        grupos: new Set(familia.articulos.map((row) => String(row.grupo_codigo ?? "").trim()).filter(Boolean)).size,
    }));
    if (sinFamilia.length) {
        named.push({
            codigo: "",
            descripcion: "Sin familia",
            articulos: sinFamilia,
            sheetName: excelSheetName(SIN_FAMILIA_CODIGO, used),
            grupos: new Set(sinFamilia.map((row) => String(row.grupo_codigo ?? "").trim()).filter(Boolean)).size,
            sinFamilia: true,
        });
    }

    const codigoCol = excelColumnLetter(0);
    const descCol = excelColumnLetter(1);
    const articuloCol = excelColumnLetter(COL.codigo);
    const firstDataRow = HEADER_ROWS + 1;

    const sheets = [
        {
            name: FAMILIAS_SHEET,
            freezeRows: HEADER_ROWS,
            mergeHeaderRows: HEADER_ROWS,
            autoFilterStartRow: HEADER_ROWS - 1,
            columnWidths: [12, 52, 14, 16],
            rows: [
                [
                    ARTICULOS_FAMILIA_HEADERS.codigo,
                    ARTICULOS_FAMILIA_HEADERS.descripcion,
                    ARTICULOS_FAMILIA_HEADERS.cantGrupos,
                    ARTICULOS_FAMILIA_HEADERS.cantArticulos,
                ],
                ...named.map((familia) => [
                    familia.sinFamilia ? "—" : familia.codigo,
                    familia.sinFamilia ? "Sin familia" : familia.descripcion,
                    familia.grupos,
                    {
                        v: familia.articulos.length,
                        f: `COUNTA(${quoteSheetName(familia.sheetName)}!${articuloCol}${firstDataRow}:${articuloCol}1048576)`,
                    },
                ]),
            ],
        },
    ];

    named.forEach((familia, index) => {
        const excelRow = index + HEADER_ROWS + 1;
        const codigoRef = `${quoteSheetName(FAMILIAS_SHEET)}!${codigoCol}${excelRow}`;
        const descRef = `${quoteSheetName(FAMILIAS_SHEET)}!${descCol}${excelRow}`;
        const titulo = familia.sinFamilia
            ? "Sin familia"
            : `${familia.codigo} – ${familia.descripcion}`;
        sheets.push({
            name: familia.sheetName,
            freezeRows: HEADER_ROWS,
            autoFilterStartRow: HEADER_ROWS - 1,
            columnWidths: [14, 36, 14, 42, 14, 10],
            merges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 5 }],
            rows: [
                [
                    {
                        v: titulo,
                        f: familia.sinFamilia ? undefined : `${codigoRef}&" – "&${descRef}`,
                        header: true,
                    },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                ],
                [
                    { v: "GRUPO", header: true },
                    { v: "NOM_GRU", header: true },
                    { v: "COD_ARTIC", header: true },
                    { v: "DESCRIP", header: true },
                    { v: "UNIDADMED", header: true },
                    { v: "IS_EPP", header: true },
                ],
                ...familia.articulos.map((row) => [
                    row.grupo_codigo ?? "",
                    row.grupo_descripcion ?? "",
                    row.codigo,
                    row.nombre,
                    row.unidad_de_medida,
                    eppLabel(row.is_epp),
                ]),
            ],
        });
    });

    downloadExcelWorkbook(sheets, filename);
}

const DEPOSITOS_SHEET = "Depósitos";

export function downloadArticulosPorDepositosExcel({ depositos = [], articulos = [] }, filename = "articulos-depositos.xlsx") {
    const byDeposito = new Map();
    for (const row of articulos) {
        const key = String(row.id_deposito ?? row.deposito_id ?? "").trim();
        if (!key) continue;
        const list = byDeposito.get(key) ?? [];
        list.push(row);
        byDeposito.set(key, list);
    }

    const named = [...depositos]
        .map((deposito) => ({
            deposito,
            articulos: byDeposito.get(String(deposito.id)) ?? [],
        }))
        .filter((item) => item.articulos.length > 0);

    const used = new Set(["depósitos", "depositos"]);
    const sheetsMeta = named.map(({ deposito, articulos: rows }) => ({
        deposito,
        articulos: rows,
        sheetName: excelSheetLabel(deposito.codigo, deposito.nombre, used),
    }));

    const articuloCol = excelColumnLetter(4);
    const firstDataRow = HEADER_ROWS + 1;
    const codigoCol = excelColumnLetter(0);
    const nombreCol = excelColumnLetter(1);

    const sheets = [
        {
            name: DEPOSITOS_SHEET,
            freezeRows: HEADER_ROWS,
            mergeHeaderRows: HEADER_ROWS,
            autoFilterStartRow: HEADER_ROWS - 1,
            columnWidths: [12, 42, 16],
            rows: [
                ["Código", "Nombre", "Cant. artículos"],
                ...sheetsMeta.map((item) => [
                    item.deposito.codigo,
                    item.deposito.nombre,
                    {
                        v: item.articulos.length,
                        f: `COUNTA(${quoteSheetName(item.sheetName)}!${articuloCol}${firstDataRow}:${articuloCol}1048576)`,
                    },
                ]),
            ],
        },
    ];

    sheetsMeta.forEach((item, index) => {
        const excelRow = index + HEADER_ROWS + 1;
        const codigoRef = `${quoteSheetName(DEPOSITOS_SHEET)}!${codigoCol}${excelRow}`;
        const nombreRef = `${quoteSheetName(DEPOSITOS_SHEET)}!${nombreCol}${excelRow}`;
        sheets.push({
            name: item.sheetName,
            freezeRows: HEADER_ROWS,
            autoFilterStartRow: HEADER_ROWS - 1,
            columnWidths: [12, 28, 12, 28, 14, 36, 12, 10, 12],
            merges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 8 }],
            rows: [
                [
                    {
                        v: `${item.deposito.codigo} – ${item.deposito.nombre}`,
                        f: `${codigoRef}&" – "&${nombreRef}`,
                        header: true,
                    },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                    { v: "", header: true },
                ],
                [
                    { v: "FAMILIA", header: true },
                    { v: "NOM_FAM", header: true },
                    { v: "GRUPO", header: true },
                    { v: "NOM_GRU", header: true },
                    { v: "COD_ARTIC", header: true },
                    { v: "DESCRIP", header: true },
                    { v: "UNIDADMED", header: true },
                    { v: "IS_EPP", header: true },
                    { v: "CANTIDAD", header: true },
                ],
                ...item.articulos.map((row) => [
                    row.familia_codigo ?? "",
                    row.familia_descripcion ?? "",
                    row.grupo_codigo ?? "",
                    row.grupo_descripcion ?? "",
                    row.codigo,
                    row.nombre,
                    row.unidad_de_medida,
                    eppLabel(row.is_epp),
                    row.cantidad_actual ?? 0,
                ]),
            ],
        });
    });

    downloadExcelWorkbook(sheets, filename);
}

function articuloFingerprint(row) {
    return [
        String(row.nombre ?? "").trim().toLowerCase(),
        String(row.unidad_de_medida ?? "").trim().toLowerCase(),
        String(row.familia_codigo ?? "").trim().toLowerCase(),
        String(row.grupo_codigo ?? "").trim().toLowerCase(),
        row.is_epp ? "1" : "0",
    ].join("|");
}

function isResumenSheet(name) {
    const key = normalizeHeader(name);
    return key === "familias" || key === "depositos";
}

function sheetMatrix(workbook, sheetName) {
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        raw: false,
    });
}

function throwParseErrors(errors) {
    if (!errors.length) return;
    const shown = errors.slice(0, 8);
    const extra = errors.length - shown.length;
    throw new Error(extra > 0
        ? `${shown.join(" ")} Y ${extra} error${extra === 1 ? "" : "es"} más.`
        : shown.join(" "));
}

export function findSheetByLabel(sheetNames, codigo, descripcion) {
    const names = sheetNames.filter((name) => !isResumenSheet(name));
    if (!names.length) return null;
    const expected = excelSheetLabel(codigo, descripcion);
    const expectedNorm = normalizeHeader(expected);
    const codeNorm = normalizeHeader(codigo);
    const exact = names.find((name) => normalizeHeader(name) === expectedNorm);
    if (exact) return exact;
    if (!codeNorm) return null;
    const byCode = names.find((name) => normalizeHeader(name) === codeNorm);
    if (byCode) return byCode;
    const prefixed = names.filter((name) => {
        const key = normalizeHeader(name);
        if (!key.startsWith(codeNorm)) return false;
        const rest = key.slice(codeNorm.length);
        return rest.length === 0 || !/^[0-9]/.test(rest);
    });
    if (prefixed.length === 1) return prefixed[0];
    return prefixed.find((name) => normalizeHeader(name) === expectedNorm) ?? null;
}

function pushParsedRows(parsed, rows, errors, seen, { allowDuplicates = false } = {}) {
    errors.push(...parsed.errors);
    for (const row of parsed.rows) {
        const key = row.codigo.toLowerCase();
        const prev = seen.get(key);
        if (prev) {
            if (allowDuplicates) {
                if (articuloFingerprint(prev.row) !== articuloFingerprint(row)) {
                    errors.push(`El código “${row.codigo}” aparece con datos distintos en “${prev.row.sheet}” y “${row.sheet}”.`);
                }
                continue;
            }
            errors.push(`Hoja “${row.sheet}”, fila ${row.excelRow}: el código “${row.codigo}” está repetido (ya está en ${prev.where}).`);
            continue;
        }
        seen.set(key, { row, where: `hoja “${row.sheet}”, fila ${row.excelRow}` });
        rows.push(row);
    }
}

function parseNamedSheet(workbook, sheetName, { familiaCodigo = "" } = {}) {
    const matrix = sheetMatrix(workbook, sheetName);
    if (!matrix.length) return { rows: [], errors: [] };
    return parseArticulosMatrix(matrix, { sheetName, familiaCodigo });
}

function dataSheetNames(workbook) {
    return workbook.SheetNames.filter((name) => !isResumenSheet(name));
}

export function parseArticulosExcel(file, {
    mode = "todos",
    familiaCodigo = "",
    familiaDescripcion = "",
    grupoCodigo = "",
    depositoCodigo = "",
    depositoNombre = "",
} = {}) {
    const workbook = XLSX.read(file, { type: "array" });
    if (workbook.SheetNames.length === 0) {
        throw new Error("El Excel no tiene hojas.");
    }

    const hasFamilias = workbook.SheetNames.some((name) => normalizeHeader(name) === "familias");
    const hasDepositos = workbook.SheetNames.some((name) => normalizeHeader(name) === "depositos");
    const rows = [];
    const errors = [];
    const seen = new Map();

    if (mode === "todos") {
        if (hasFamilias) {
            throw new Error("Este Excel es por familia. Elegí “Por familia / grupo” antes de cargarlo.");
        }
        if (hasDepositos) {
            throw new Error("Este Excel es por depósito. Elegí “Por depósito” antes de cargarlo.");
        }
        const sheetName = workbook.SheetNames.includes(ARTICULOS_SHEET)
            ? ARTICULOS_SHEET
            : workbook.SheetNames[0];
        if (
            workbook.SheetNames.length === 1
            && normalizeHeader(sheetName) !== normalizeHeader(ARTICULOS_SHEET)
        ) {
            throw new Error(`La hoja se llama “${sheetName}”. Si es de una familia o un depósito, elegí esa opción antes de cargar.`);
        }
        pushParsedRows(parseNamedSheet(workbook, sheetName), rows, errors, seen);
    } else if (mode === "familia") {
        if (hasDepositos && !hasFamilias) {
            throw new Error("Este Excel es por depósito. Elegí “Por depósito” antes de cargarlo.");
        }
        if (familiaCodigo) {
            const sheetName = findSheetByLabel(workbook.SheetNames, familiaCodigo, familiaDescripcion);
            if (!sheetName) {
                throw new Error(`No está la hoja “${excelSheetLabel(familiaCodigo, familiaDescripcion)}”.`);
            }
            pushParsedRows(
                parseNamedSheet(workbook, sheetName, { familiaCodigo }),
                rows,
                errors,
                seen,
            );
        } else {
            const sheets = dataSheetNames(workbook);
            if (!hasFamilias && sheets.length === 1) {
                throw new Error(`Este Excel tiene una sola hoja (“${sheets[0]}”). Elegí esa familia, o usá el Excel de todas las familias.`);
            }
            if (!sheets.length) throw new Error("El Excel no tiene planillas de artículos.");
            for (const sheetName of sheets) {
                pushParsedRows(parseNamedSheet(workbook, sheetName), rows, errors, seen);
            }
        }
    } else if (mode === "deposito") {
        if (hasFamilias && !hasDepositos) {
            throw new Error("Este Excel es por familia. Elegí “Por familia / grupo” antes de cargarlo.");
        }
        if (depositoCodigo) {
            const sheetName = findSheetByLabel(workbook.SheetNames, depositoCodigo, depositoNombre);
            if (!sheetName) {
                throw new Error(`No está la hoja “${excelSheetLabel(depositoCodigo, depositoNombre)}”.`);
            }
            pushParsedRows(parseNamedSheet(workbook, sheetName), rows, errors, seen);
        } else {
            const sheets = dataSheetNames(workbook);
            if (!hasDepositos && sheets.length === 1) {
                throw new Error(`Este Excel tiene una sola hoja (“${sheets[0]}”). Elegí ese depósito, o usá el Excel de todos los depósitos.`);
            }
            if (!sheets.length) throw new Error("El Excel no tiene planillas de artículos.");
            for (const sheetName of sheets) {
                pushParsedRows(parseNamedSheet(workbook, sheetName), rows, errors, seen, { allowDuplicates: true });
            }
        }
    } else {
        throw new Error("Elegí cómo es el Excel antes de cargarlo.");
    }

    throwParseErrors(errors);

    const grupoKey = normalizeHeader(grupoCodigo);
    const scoped = grupoKey
        ? rows.filter((row) => normalizeHeader(row.grupo_codigo) === grupoKey)
        : rows;
    if (grupoKey && !scoped.length) {
        throw new Error(`No hay artículos del grupo “${grupoCodigo}” en el Excel.`);
    }
    if (!scoped.length) throw new Error("El Excel no tiene artículos válidos.");
    return scoped;
}
