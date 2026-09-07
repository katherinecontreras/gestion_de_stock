import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, InternalCode } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableShell } from "@/components/ui/table";
import { useToast } from "@/app/layouts/ToastProvider";
import { explainMovimientoError, getMovimiento, signedUrlsRemito } from "@/services/movimientos";
import { formatDate, formatDateTime, formatFamiliaGrupo } from "@/utils/format";
import { formatDepositosMovimiento, labelTipoEntregaEpp, labelTipoMovimiento, recambioEstado, toneTipoMovimiento } from "@/utils/movimientos";
import { SPA_PATHS } from "@/utils/routes";

export function MovimientoDetalleScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notify } = useToast();
    const [mov, setMov] = useState(null);
    const [fotos, setFotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getMovimiento(id)
            .then(async (row) => {
                if (cancelled) return;
                if (!row) {
                    setError("No se encontró el movimiento.");
                    setMov(null);
                    return;
                }
                setMov(row);
                setError(null);
                if (row.fotos_remito.length) {
                    const urls = await signedUrlsRemito(row.fotos_remito);
                    if (!cancelled) setFotos(urls);
                } else {
                    setFotos([]);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                const text = explainMovimientoError(err);
                setError(text);
                notify(text, "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [id, notify]);

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    const alerta = mov?.tipo === "Entrega_EPP" ? recambioEstado(mov.fecha_recambio, false) : null;

    return (
        <section>
            <PageHeader
                title={mov ? `Movimiento ${labelTipoMovimiento(mov.tipo)}` : "Detalle de movimiento"}
                description={mov ? `Remito ${mov.nro_remito}` : "Cabecera y artículos del movimiento."}
                actions={
                    <Button variant="secondary" onClick={() => navigate(SPA_PATHS.movimientos)}>
                        <ArrowLeft size={18} strokeWidth={1.6} />
                        Volver
                    </Button>
                }
            />

            {error ? <Alert>{error}</Alert> : null}

            {mov ? (
                <div className="space-y-5">
                    <Card>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Dato label="Tipo">
                                <Badge tone={toneTipoMovimiento(mov.tipo)}>{labelTipoMovimiento(mov.tipo)}</Badge>
                                {mov.es_devolucion ? <span className="ml-2 text-xs text-app-mutedtext">Devolución</span> : null}
                            </Dato>
                            <Dato label="Fecha">{formatDateTime(mov.fecha)}</Dato>
                            <Dato label="Responsable">{mov.responsable?.etiqueta || "—"}</Dato>
                            <Dato label="Depósito">{formatDepositosMovimiento(mov.tipo, mov.origen, mov.destino)}</Dato>
                            <Dato label="Nro. remito">{mov.nro_remito}</Dato>
                            <Dato label="Cant. artículos">{mov.cant_total_articulos}</Dato>
                            {mov.proveedor ? <Dato label="Proveedor">{mov.proveedor.etiqueta}</Dato> : null}
                            {mov.motivo ? <Dato label="Motivo" className="sm:col-span-2">{mov.motivo}</Dato> : null}
                            {mov.tipo === "Entrega_EPP" ? (
                                <>
                                    <Dato label="Tipo de entrega">{labelTipoEntregaEpp(mov.tipo_entrega_epp) ?? "—"}</Dato>
                                    <Dato label="Empleado">
                                        {mov.empleado
                                            ? `${mov.empleado.etiqueta} · DNI ${mov.empleado.dni} · ${mov.empleado.email}`
                                            : "—"}
                                    </Dato>
                                    <Dato label="Fecha de recambio">{formatDate(mov.fecha_recambio)}</Dato>
                                    {alerta ? (
                                        <Dato label="Estado de recambio">
                                            <Badge tone={alerta === "Debe recambiarse" ? "warning" : "info"}>{alerta}</Badge>
                                        </Dato>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                    </Card>

                    {fotos.length > 0 ? (
                        <Card title="Fotos del remito">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {fotos.map((foto) => (
                                    foto.url ? (
                                        <a key={foto.path} href={foto.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-control border border-app-border">
                                            <img src={foto.url} alt="Hoja de remito" className="h-40 w-full object-cover" />
                                        </a>
                                    ) : null
                                ))}
                            </div>
                        </Card>
                    ) : null}

                    <TableShell empty={mov.articulos.length === 0 ? "Este movimiento no tiene artículos." : undefined}>
                        {mov.articulos.length > 0 ? (
                            <table className="w-full min-w-[56rem] text-left text-sm">
                                <thead className="bg-app-muted text-app-mutedtext">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Familia</th>
                                        <th className="px-4 py-3 font-semibold">Grupo</th>
                                        <th className="px-4 py-3 font-semibold">Código</th>
                                        <th className="px-4 py-3 font-semibold">Nombre</th>
                                        <th className="px-4 py-3 text-right font-semibold">Cantidad</th>
                                        <th className="px-4 py-3 font-semibold">Observación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mov.articulos.map((linea, index) => (
                                        <TableAppearRow key={linea.id} index={index} className="border-t border-app-border-subtle">
                                            <td className="px-4 py-3">
                                                {linea.familia_codigo
                                                    ? formatFamiliaGrupo(linea.familia_codigo, linea.familia_descripcion)
                                                    : <span className="text-app-faint">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {linea.grupo_codigo
                                                    ? formatFamiliaGrupo(linea.grupo_codigo, linea.grupo_descripcion)
                                                    : <span className="text-app-faint">—</span>}
                                            </td>
                                            <td className="px-4 py-3"><InternalCode>{linea.codigo}</InternalCode></td>
                                            <td className="px-4 py-3 font-medium text-app-primary">{linea.nombre}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {linea.cantidad} {linea.unidad_de_medida}
                                            </td>
                                            <td className="px-4 py-3 text-app-secondarytext">{linea.observacion || "—"}</td>
                                        </TableAppearRow>
                                    ))}
                                </tbody>
                            </table>
                        ) : null}
                    </TableShell>
                </div>
            ) : null}
        </section>
    );
}

function Dato({ label, className, children }) {
    return (
        <div className={className}>
            <p className="text-xs font-medium text-app-mutedtext">{label}</p>
            <div className="mt-0.5 text-sm text-app-primary">{children}</div>
        </div>
    );
}
