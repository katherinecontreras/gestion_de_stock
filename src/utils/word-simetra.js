import { wImageParagraph, wParagraph, wTable, wTableCell, wText } from "./word";

export const SIMETRA = {
    tableWidth: 8788,
    col4: 2197,
    headerCols: [1601, 5732, 1455],
    fillSection: "C0C0C0",
    fillHeader: "C6D9F1",
    fillHeaderAlt: "BDD6EE",
    logoRelId: "rIdLogo",
    logoName: "logo-simetra.png",
    logoCx: 685800,
    logoCy: 495300,
    logoSrc: "/word/logo-simetra.png",
};

export async function loadSimetraLogo() {
    try {
        const response = await fetch(SIMETRA.logoSrc);
        if (!response.ok) return null;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!bytes.byteLength) return null;
        return {
            relId: SIMETRA.logoRelId,
            name: SIMETRA.logoName,
            bytes,
        };
    } catch {
        return null;
    }
}

function headerCell(content, width, margin) {
    return wTableCell(content, { width, valign: "center", margin });
}

export function simetraHeaderXml({ category, title, metaLines, hasLogo }) {
    const logo = hasLogo
        ? wParagraph(
            `<w:r><w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${SIMETRA.logoCx}" cy="${SIMETRA.logoCy}"/>
          <wp:docPr id="1" name="Logo Simetra"/>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="logo-simetra.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${SIMETRA.logoRelId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${SIMETRA.logoCx}" cy="${SIMETRA.logoCy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing></w:r>`,
            { align: "center" },
        )
        : wParagraph(wText("SIMETRA", { bold: true, size: 16 }), { align: "center" });

    const center = [
        wParagraph(wText(category, { size: 18 }), { align: "center", spacingAfter: 80 }),
        wParagraph(wText(title, { bold: true, size: 24 }), { align: "center" }),
    ].join("");

    const meta = metaLines.map((line, index) => (
        wParagraph(wText(line, { bold: true, size: index === metaLines.length - 1 ? 16 : 18 }), {
            align: "center",
            spacingAfter: index === metaLines.length - 1 ? 0 : 20,
        })
    )).join("");

    const [leftW, midW, rightW] = SIMETRA.headerCols;
    const row = `<w:tr>
      ${headerCell(logo, leftW, { top: 60, left: 60, bottom: 60, right: 60 })}
      ${headerCell(center, midW, { top: 90, left: 60, bottom: 90, right: 60 })}
      ${headerCell(meta, rightW, { top: 60, left: 60, bottom: 60, right: 60 })}
    </w:tr>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  ${wTable(row, SIMETRA.headerCols, { after: 0 })}
</w:hdr>`;
}

export function simetraFooterXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:spacing w:after="0" w:before="0" w:line="200"/>
      <w:jc w:val="right"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:fldChar w:fldCharType="begin"/>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:instrText xml:space="preserve"> PAGE </w:instrText>
    </w:r>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="16"/><w:szCs w:val="16"/>
      </w:rPr>
      <w:fldChar w:fldCharType="end"/>
    </w:r>
  </w:p>
</w:ftr>`;
}

export function simetraSectPr() {
    return `<w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="11907" w:h="16839" w:orient="portrait"/>
      <w:pgMar w:top="1440" w:right="1701" w:bottom="851" w:left="1418" w:header="850" w:footer="708" w:gutter="0"/>
    </w:sectPr>`;
}

function fieldParagraph(label, value) {
    return wParagraph(
        wText(`${label}: `, { bold: true, size: 18 })
        + wText(value, { size: 18 }),
        { align: "left" },
    );
}

export function simetraSectionRow(title, { fill = SIMETRA.fillSection, size = 22, span = 4 } = {}) {
    return `<w:tr>${wTableCell(
        wParagraph(wText(title, { bold: true, size }), { align: "center" }),
        {
            width: SIMETRA.tableWidth,
            gridSpan: span,
            fill,
            margin: { top: 80, left: 60, bottom: 80, right: 60 },
        },
    )}</w:tr>`;
}

export function simetraWideRow(text, { span = 4 } = {}) {
    return `<w:tr>${wTableCell(
        wParagraph(wText(text, { size: 18 })),
        { width: SIMETRA.tableWidth, gridSpan: span },
    )}</w:tr>`;
}

export function simetraPairRow(left, right) {
    const leftCell = wTableCell(
        fieldParagraph(left.label, left.value),
        { width: SIMETRA.col4 * 2, gridSpan: 2 },
    );
    const rightCell = right
        ? wTableCell(fieldParagraph(right.label, right.value), { width: SIMETRA.col4 * 2, gridSpan: 2 })
        : wTableCell(wParagraph(""), { width: SIMETRA.col4 * 2, gridSpan: 2 });
    return `<w:tr>${leftCell}${rightCell}</w:tr>`;
}

export function simetraFullRow(label, value) {
    return `<w:tr>${wTableCell(
        fieldParagraph(label, value),
        { width: SIMETRA.tableWidth, gridSpan: 4 },
    )}</w:tr>`;
}

export function simetraHeaderRow(labels, widths) {
    return `<w:tr>${labels.map((label, index) => wTableCell(
        wParagraph(wText(label, { bold: true, size: 18 }), { align: "center" }),
        { width: widths[index], fill: SIMETRA.fillHeader },
    )).join("")}</w:tr>`;
}

export function simetraDataRow(values, widths) {
    return `<w:tr>${values.map((value, index) => wTableCell(
        wParagraph(wText(value, { size: 18 }), { align: index === 4 ? "right" : "left" }),
        { width: widths[index] },
    )).join("")}</w:tr>`;
}

export function simetraFormTable(rowsXml, colWidths = [SIMETRA.col4, SIMETRA.col4, SIMETRA.col4, SIMETRA.col4]) {
    return wTable(rowsXml, colWidths, { after: 200 });
}

export function simetraBodyWrap(innerXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${innerXml}
    ${simetraSectPr()}
  </w:body>
</w:document>`;
}

export function simetraImageBlock(image, index) {
    return wParagraph(wText(image.label, { bold: true, size: 18 }), { spacingBefore: 120, spacingAfter: 60 })
        + wImageParagraph(image.relId, image.label, 5486400, Math.round(5486400 * 0.62), index + 10);
}

