import { formatDate, formatFamiliaGrupo, formatTime } from "./format";
import { formatDepositosMovimiento, labelTipoEntregaEpp, labelTipoMovimiento, recambioEstado } from "./movimientos";
import { buildDocx, downloadDocx, safeDownloadName } from "./word";
import {
    loadSimetraLogo,
    simetraBodyWrap,
    simetraDataRow,
    simetraFooterXml,
    simetraFormTable,
    simetraFullRow,
    simetraWideRow,
    simetraHeaderRow,
    simetraHeaderXml,
    simetraImageBlock,
    simetraPairRow,
    simetraSectionRow,
} from "./word-simetra";

function dash(value) {
    const text = String(value ?? "").trim();
    return text || "—";
}

function imageKind(path, contentType) {
    const type = String(contentType ?? "").toLowerCase();
    const lower = String(path ?? "").toLowerCase();
    if (type.includes("png") || lower.endsWith(".png")) return { ext: "png" };
    return { ext: "jpeg" };
}

async function loadRemitoImages(fotos) {
    const images = [];
    for (const [index, foto] of (fotos ?? []).entries()) {
        if (!foto?.url) continue;
        try {
            const response = await fetch(foto.url);
            if (!response.ok) continue;
            const buffer = new Uint8Array(await response.arrayBuffer());
            if (!buffer.byteLength) continue;
            const kind = imageKind(foto.path, response.headers.get("content-type"));
            images.push({
                relId: `rIdImg${images.length + 1}`,
                name: `remito-${images.length + 1}.${kind.ext}`,
                bytes: buffer,
                label: `Foto del remito ${images.length + 1}`,
            });
        } catch {
            // Si una foto no se puede leer, el Word sigue con el resto del detalle.
        }
        if (index >= 11) break;
    }
    return images;
}

function datosTable(mov) {
    const rows = [
        simetraSectionRow("DATOS DEL MOVIMIENTO"),
        simetraPairRow(
            { label: "RESPONSABLE", value: dash(mov.responsable?.etiqueta) },
            { label: "DEPÓSITO", value: dash(formatDepositosMovimiento(mov.tipo, mov.origen, mov.destino)) },
        ),
        simetraPairRow(
            { label: "NRO. REMITO", value: dash(mov.nro_remito) },
            { label: "CANT. ARTÍCULOS", value: String(mov.cant_total_articulos ?? mov.articulos?.length ?? 0) },
        ),
    ];
    if (mov.proveedor) {
        rows.push(simetraPairRow(
            { label: "PROVEEDOR", value: mov.proveedor.etiqueta },
            mov.motivo ? { label: "MOTIVO", value: mov.motivo } : null,
        ));
    } else if (mov.motivo) {
        rows.push(simetraFullRow("MOTIVO", mov.motivo));
    }
    rows.push(simetraPairRow(
        { label: "FOTOS DEL REMITO", value: String(mov.fotos_remito?.length ?? 0) },
        null,
    ));

    if (mov.tipo === "Entrega_EPP") {
        const alerta = recambioEstado(mov.fecha_recambio, false);
        rows.push(simetraSectionRow("ENTREGA EPP"));
        rows.push(simetraPairRow(
            { label: "TIPO DE ENTREGA", value: dash(labelTipoEntregaEpp(mov.tipo_entrega_epp)) },
            { label: "EMPLEADO", value: mov.empleado ? `${mov.empleado.etiqueta} · DNI ${mov.empleado.dni}` : "—" },
        ));
        rows.push(simetraPairRow(
            { label: "FECHA DE RECAMBIO", value: formatDate(mov.fecha_recambio) },
            alerta ? { label: "ESTADO DE RECAMBIO", value: alerta } : null,
        ));
    }

    return simetraFormTable(rows.join(""));
}

function articulosTable(mov) {
    const widths = [1400, 1400, 1100, 2000, 1100, 1788];
    const header = simetraHeaderRow(
        ["FAMILIA", "GRUPO", "CÓDIGO", "NOMBRE", "CANTIDAD", "OBSERVACIÓN"],
        widths,
    );
    const body = (mov.articulos ?? []).length
        ? (mov.articulos ?? []).map((linea) => simetraDataRow([
            linea.familia_codigo ? formatFamiliaGrupo(linea.familia_codigo, linea.familia_descripcion) : "—",
            linea.grupo_codigo ? formatFamiliaGrupo(linea.grupo_codigo, linea.grupo_descripcion) : "—",
            dash(linea.codigo),
            dash(linea.nombre),
            `${linea.cantidad} ${linea.unidad_de_medida ?? ""}`.trim(),
            dash(linea.observacion),
        ], widths)).join("")
        : simetraWideRow("Este movimiento no tiene artículos.", { span: 6 });

    return simetraFormTable(
        `${simetraSectionRow("ARTÍCULOS", { span: 6 })}${header}${body}`,
        widths,
    );
}

function documentXml(mov, images) {
    const photos = images.length
        ? simetraFormTable(simetraSectionRow("FOTOS DEL REMITO"))
            + images.map((image, index) => simetraImageBlock(image, index)).join("")
        : "";
    return simetraBodyWrap(`${datosTable(mov)}${articulosTable(mov)}${photos}`);
}

export function movimientoWordFilename(mov) {
    const tipo = safeDownloadName(labelTipoMovimiento(mov.tipo), "movimiento").toLowerCase();
    const remito = safeDownloadName(mov.nro_remito, mov.id ?? "detalle");
    return `movimiento-${tipo}-${remito}.docx`;
}

export async function buildMovimientoDocx(mov, fotos = []) {
    if (!mov) {
        throw new Error("No hay un movimiento para descargar.");
    }
    const [logo, images] = await Promise.all([
        loadSimetraLogo(),
        loadRemitoImages(fotos),
    ]);
    return buildDocx({
        documentXml: documentXml(mov, images),
        title: `Detalle de movimiento · ${labelTipoMovimiento(mov.tipo)} · Remito ${dash(mov.nro_remito)}`,
        images,
        headerXml: simetraHeaderXml({
            category: "GESTIÓN DE STOCK",
            title: "DETALLE DE MOVIMIENTO",
            metaLines: [
                `${labelTipoMovimiento(mov.tipo)}${mov.es_devolucion ? " · Devolución" : ""}`.toUpperCase(),
                formatDate(mov.fecha),
                formatTime(mov.fecha),
            ],
            hasLogo: Boolean(logo),
        }),
        footerXml: simetraFooterXml(),
        headerImages: logo ? [logo] : [],
    });
}

export async function downloadMovimientoWord(mov, fotos = []) {
    const bytes = await buildMovimientoDocx(mov, fotos);
    downloadDocx(bytes, movimientoWordFilename(mov));
}
