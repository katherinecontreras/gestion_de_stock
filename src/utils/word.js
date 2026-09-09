import { zipSync, strToU8 } from "fflate";

const WORD_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function xmlEscape(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function safeDownloadName(value, fallback = "documento") {
    const cleaned = String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    return cleaned || fallback;
}

export function downloadBytes(bytes, filename, mime) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function downloadDocx(bytes, filename) {
    downloadBytes(bytes, filename, WORD_MIME);
}

function contentTypesXml() {
    const imageDefaults = [
        '<Default Extension="png" ContentType="image/png"/>',
        '<Default Extension="jpeg" ContentType="image/jpeg"/>',
        '<Default Extension="jpg" ContentType="image/jpeg"/>',
    ];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${imageDefaults.join("\n  ")}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
}

function rootRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
}

function documentRelsXml(images, { header, footer } = {}) {
    const extra = [
        header ? '<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : "",
        footer ? '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : "",
        ...images.map((image) => (
            `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.name}"/>`
        )),
    ].filter(Boolean).join("\n  ");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${extra}
</Relationships>`;
}

function headerRelsXml(images) {
    const imageRels = images.map((image) => (
        `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.name}"/>`
    )).join("\n  ");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${imageRels}
</Relationships>`;
}

function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="0F172A"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;
}

function coreXml(title) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(title)}</dc:title>
  <dc:creator>Gestión de Stock — Simetra Service SA</dc:creator>
</cp:coreProperties>`;
}

export function buildDocx({
    documentXml,
    title = "Documento",
    images = [],
    headerXml,
    footerXml,
    headerImages = [],
}) {
    const files = {
        "[Content_Types].xml": strToU8(contentTypesXml()),
        "_rels/.rels": strToU8(rootRelsXml()),
        "docProps/core.xml": strToU8(coreXml(title)),
        "word/document.xml": strToU8(documentXml),
        "word/_rels/document.xml.rels": strToU8(documentRelsXml(images, {
            header: Boolean(headerXml),
            footer: Boolean(footerXml),
        })),
        "word/styles.xml": strToU8(stylesXml()),
    };
    if (headerXml) {
        files["word/header1.xml"] = strToU8(headerXml);
        if (headerImages.length) {
            files["word/_rels/header1.xml.rels"] = strToU8(headerRelsXml(headerImages));
        }
    }
    if (footerXml) {
        files["word/footer1.xml"] = strToU8(footerXml);
    }
    for (const image of [...headerImages, ...images]) {
        files[`word/media/${image.name}`] = image.bytes;
    }
    return zipSync(files, { level: 6 });
}

export function wText(text, { bold = false, size = 20, color, font = "Arial" } = {}) {
    return `<w:r><w:rPr>${bold ? "<w:b/><w:bCs/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${color ? `<w:color w:val="${color}"/>` : ""}<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

export function wParagraph(runsXml, { align, spacingAfter = 0, spacingBefore = 0, line = 200 } = {}) {
    const jc = align ? `<w:jc w:val="${align}"/>` : "";
    return `<w:p><w:pPr><w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}" w:line="${line}"/>${jc}</w:pPr>${runsXml || ""}</w:p>`;
}

function cellBordersXml() {
    return `<w:tcBorders>
      <w:top w:val="single" w:color="000000" w:sz="8"/>
      <w:left w:val="single" w:color="000000" w:sz="8"/>
      <w:bottom w:val="single" w:color="000000" w:sz="8"/>
      <w:right w:val="single" w:color="000000" w:sz="8"/>
    </w:tcBorders>`;
}

export function wTableCell(contentXml, {
    width,
    fill,
    valign = "center",
    gridSpan,
    borders = true,
    margin = { top: 55, left: 60, bottom: 55, right: 60 },
} = {}) {
    return `<w:tc><w:tcPr>
      <w:tcW w:w="${width}" w:type="dxa"/>
      ${gridSpan ? `<w:gridSpan w:val="${gridSpan}"/>` : ""}
      ${borders ? cellBordersXml() : ""}
      ${fill ? `<w:shd w:val="clear" w:fill="${fill}"/>` : ""}
      <w:tcMar>
        <w:top w:type="dxa" w:w="${margin.top}"/>
        <w:left w:type="dxa" w:w="${margin.left}"/>
        <w:bottom w:type="dxa" w:w="${margin.bottom}"/>
        <w:right w:type="dxa" w:w="${margin.right}"/>
      </w:tcMar>
      <w:vAlign w:val="${valign}"/>
    </w:tcPr>${contentXml}</w:tc>`;
}

export function wTable(rowsXml, colWidths, { after = 160 } = {}) {
    const total = colWidths.reduce((sum, width) => sum + width, 0);
    const grid = colWidths.map((width) => `<w:gridCol w:w="${width}"/>`).join("");
    return `<w:tbl>
  <w:tblPr>
    <w:tblW w:w="${total}" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:color="auto"/>
      <w:left w:val="single" w:sz="4" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:color="auto"/>
      <w:right w:val="single" w:sz="4" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:color="auto"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>${grid}</w:tblGrid>
  ${rowsXml}
</w:tbl>
${after ? wParagraph("", { spacingAfter: after }) : ""}`;
}

export function wImageParagraph(relId, name, cx, cy, docPrId) {
    return `<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${cx}" cy="${cy}"/>
        <wp:docPr id="${docPrId}" name="${xmlEscape(name)}"/>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="${docPrId}" name="${xmlEscape(name)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${cx}" cy="${cy}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
}
