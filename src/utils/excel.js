import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import * as XLSXStyle from "xlsx-js-style";
const XLSX = XLSXStyle.utils != null
    ? XLSXStyle
    : (XLSXStyle.default ??
        XLSXStyle);
const HEADER_STYLE = {
    font: { bold: true, color: { rgb: "000000" }, sz: 11, name: "Calibri" },
    fill: { patternType: "solid", fgColor: { rgb: "8EC5EA" } },
    alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
    },
    border: {
        top: { style: "thin", color: { rgb: "6BA8D9" } },
        bottom: { style: "thin", color: { rgb: "6BA8D9" } },
        left: { style: "thin", color: { rgb: "6BA8D9" } },
        right: { style: "thin", color: { rgb: "6BA8D9" } },
    },
};
const DATA_STYLE = {
    font: { sz: 11, name: "Calibri", color: { rgb: "0F172A" } },
    alignment: { vertical: "center" },
    border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
};
function cellDisplay(value) {
    if (value === null || value === undefined)
        return "";
    if (typeof value === "object") {
        if (value.v === null || value.v === undefined)
            return "";
        return String(value.v);
    }
    return String(value);
}
function cellWidth(value) {
    const text = cellDisplay(value);
    let width = 0;
    for (const char of text) {
        width += char.charCodeAt(0) > 255 ? 2 : 1;
    }
    return width;
}
export function fitSheetColumns(rows) {
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    return Array.from({ length: colCount }, (_, col) => {
        let max = 0;
        for (const row of rows) {
            max = Math.max(max, cellWidth(row[col]));
        }
        return { wch: Math.max(max + 2, 8) };
    });
}
function columnLetter(index) {
    let letter = "";
    let n = index + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}
export function excelColumnLetter(index) {
    return columnLetter(index);
}
function freezePaneXml(ySplit, topLeft) {
    return (`<pane ySplit="${ySplit}" topLeftCell="${topLeft}" activePane="bottomLeft" state="frozen"/>` +
        `<selection pane="bottomLeft" activeCell="${topLeft}" sqref="${topLeft}"/>`);
}
function applyFreeze(xml, ySplit, topLeft) {
    if (ySplit < 1 || xml.includes('state="frozen"'))
        return xml;
    const pane = freezePaneXml(ySplit, topLeft);
    if (/<sheetView\b[^>]*\/>/.test(xml)) {
        return xml.replace(/<sheetView\b([^>]*)\/>/, `<sheetView$1>${pane}</sheetView>`);
    }
    if (/<sheetView\b[^>]*>/.test(xml)) {
        return xml.replace(/<sheetView\b([^>]*)>/, `<sheetView$1>${pane}`);
    }
    if (xml.includes("<sheetViews>")) {
        return xml.replace("<sheetViews>", `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView>`);
    }
    if (/<dimension\b[^>]*\/>/.test(xml)) {
        return xml.replace(/(<dimension\b[^>]*\/>)/, `$1<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>`);
    }
    return xml.replace("<sheetData", `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetData`);
}
function withFrozenPanes(xlsxBytes, splits) {
    const files = unzipSync(xlsxBytes);
    const sheetFiles = Object.keys(files)
        .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
        .sort((a, b) => {
        const na = Number(a.match(/sheet(\d+)/)?.[1] ?? 0);
        const nb = Number(b.match(/sheet(\d+)/)?.[1] ?? 0);
        return na - nb;
    });
    sheetFiles.forEach((name, index) => {
        const spec = splits[index] ?? { ySplit: 1, topLeft: "A2" };
        if (spec.ySplit < 1)
            return;
        files[name] = strToU8(applyFreeze(strFromU8(files[name]), spec.ySplit, spec.topLeft));
    });
    return zipSync(files, { level: 6 });
}
function isCellObject(value) {
    return Boolean(value) && typeof value === "object";
}
function excelRowIndex(inputRow, mergeHeaderRows) {
    if (mergeHeaderRows <= 1 || inputRow === 0)
        return inputRow + 1;
    return inputRow + mergeHeaderRows;
}
export function sheetFromRows(rows, options) {
    const sheet = {};
    const startCol = Math.max(options?.startCol ?? 0, 0);
    const mergeHeaderRows = Math.max(options?.mergeHeaderRows ?? 1, 1);
    const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const lastInputRow = Math.max(rows.length - 1, 0);
    const lastRow = Math.max(excelRowIndex(lastInputRow, mergeHeaderRows), 1);
    for (let row = 0; row < rows.length; row += 1) {
        const line = rows[row] ?? [];
        const excelRow = excelRowIndex(row, mergeHeaderRows);
        for (let col = 0; col < Math.max(colCount, line.length); col += 1) {
            const value = line[col];
            if (value === undefined && col >= line.length)
                continue;
            const address = `${columnLetter(startCol + col)}${excelRow}`;
            const object = isCellObject(value) ? value : null;
            const isHeader = object?.header === true || row === 0;
            const raw = object ? object.v : value;
            const isNumber = typeof raw === "number";
            const cell = {
                v: raw === null || raw === undefined ? (isNumber ? 0 : "") : raw,
                t: isNumber ? "n" : "s",
                s: isHeader
                    ? HEADER_STYLE
                    : isNumber
                        ? { ...DATA_STYLE, alignment: { ...DATA_STYLE.alignment, horizontal: "center" } }
                        : DATA_STYLE,
            };
            if (object?.f)
                cell.f = object.f;
            sheet[address] = cell;
        }
    }
    const extraMerges = (options?.merges ?? []).map((merge) => ({
        s: { r: merge.startRow, c: startCol + merge.startCol },
        e: { r: merge.endRow, c: startCol + merge.endCol },
    }));
    const headerMerges = mergeHeaderRows > 1 && colCount > 0
        ? Array.from({ length: colCount }, (_, col) => ({
            s: { r: 0, c: startCol + col },
            e: { r: mergeHeaderRows - 1, c: startCol + col },
        }))
        : [];
    const merges = [...headerMerges, ...extraMerges];
    if (merges.length > 0) {
        sheet["!merges"] = merges;
    }
    const firstCol = columnLetter(startCol);
    const lastCol = columnLetter(Math.max(startCol + colCount - 1, startCol));
    const filterStart = (options?.autoFilterStartRow ?? 0) + 1;
    sheet["!ref"] = `A1:${lastCol}${lastRow}`;
    const fitted = fitSheetColumns(rows);
    const widths = options?.columnWidths ?? [];
    sheet["!cols"] = [
        ...Array.from({ length: startCol }, () => ({ wch: 3 })),
        ...fitted.map((col, index) => ({
            wch: widths[index] ?? col.wch,
        })),
    ];
    sheet["!rows"] = Array.from({ length: Math.max(mergeHeaderRows, options?.freezeRows ?? 1, 1) }, () => ({ hpt: 24 }));
    if (lastRow >= filterStart) {
        sheet["!autofilter"] = {
            ref: `${firstCol}${filterStart}:${lastCol}${lastRow}`,
        };
    }
    return sheet;
}
export function buildExcelWorkbook(sheets) {
    const workbook = XLSX.utils.book_new();
    const splits = sheets.map((sheet) => {
        const ySplit = sheet.freezeRows ?? 1;
        const startCol = sheet.startCol ?? 0;
        return {
            ySplit,
            topLeft: `${columnLetter(startCol)}${ySplit + 1}`,
        };
    });
    for (const sheet of sheets) {
        XLSX.utils.book_append_sheet(workbook, sheetFromRows(sheet.rows, {
            freezeRows: sheet.freezeRows,
            autoFilterStartRow: sheet.autoFilterStartRow,
            startCol: sheet.startCol,
            mergeHeaderRows: sheet.mergeHeaderRows,
            merges: sheet.merges,
            columnWidths: sheet.columnWidths,
        }), sheet.name);
    }
    const bytes = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
        cellStyles: true,
    });
    return withFrozenPanes(new Uint8Array(bytes), splits);
}
export function downloadExcelWorkbook(sheets, filename) {
    const bytes = buildExcelWorkbook(sheets);
    const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
