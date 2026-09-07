import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { FormModal } from "@/components/modals/form-modal";
import { Alert } from "@/components/ui/alert";
import { Badge, InternalCode } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import {
    ARTICULOS_MOVIMIENTO_PAGE_SIZE,
    createEmpleado,
    crearMovimiento,
    explainMovimientoError,
    listArticulosParaMovimiento,
    listDepositosActivosOpciones,
    listEmpleados,
    listMisDepositosOpciones,
    listProveedoresActivosOpciones,
    listTiposMovimiento,
    signedUrlsRemito,
    uploadFotosRemito,
} from "@/services/movimientos";
import { listFamiliasOpciones, listGruposOpciones } from "@/services/articulos";
import { cn } from "@/utils/cn";
import { formatFamiliaGrupo } from "@/utils/format";
import { labelTipoMovimiento, TIPO_ENTREGA_EPP, TIPO_MOVIMIENTO } from "@/utils/movimientos";
import { SPA_PATHS } from "@/utils/routes";

const SELECT_CLASS = "w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus";
const STEPS = ["Tipo", "Datos y remito", "Artículos", "Revisar y cargar"];

function emptyDatos() {
    return {
        origen: "",
        destino: "",
        proveedor: "",
        esDevolucion: "no",
        motivo: "",
        tipoEntregaEpp: "",
        nroRemito: "",
    };
}

export function NuevoMovimientoScreen() {
    const navigate = useNavigate();
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const canWrite = Boolean(perfil?.esAdministrador || perfil?.esResponsableDeposito);
    const fileRef = useRef(null);

    const [step, setStep] = useState(0);
    const [tipos, setTipos] = useState([]);
    const [depositos, setDepositos] = useState([]);
    const [misDepositos, setMisDepositos] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loadingOpts, setLoadingOpts] = useState(true);
    const [tipo, setTipo] = useState("");
    const [datos, setDatos] = useState(emptyDatos);
    const [fotos, setFotos] = useState([]);
    const [empleado, setEmpleado] = useState(null);
    const [empleadoSearch, setEmpleadoSearch] = useState("");
    const [empleadoHits, setEmpleadoHits] = useState([]);
    const [altaEmpleado, setAltaEmpleado] = useState({ nombre: "", apellido: "", dni: "", email: "" });
    const [mostrarAltaEmpleado, setMostrarAltaEmpleado] = useState(false);
    const [selected, setSelected] = useState({});
    const [artSearchInput, setArtSearchInput] = useState("");
    const [artSearch, setArtSearch] = useState("");
    const [filtroFamilia, setFiltroFamilia] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const [familias, setFamilias] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [artPage, setArtPage] = useState(0);
    const [artRows, setArtRows] = useState([]);
    const [artTotal, setArtTotal] = useState(0);
    const [artLoading, setArtLoading] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const origenes = perfil?.esAdministrador ? depositos : misDepositos;
    const destinos = depositos.filter((dep) => dep.id !== datos.origen);
    const origenesFiltrados = origenes.filter((dep) => dep.id !== datos.destino);
    const idTipo = tipos.find((row) => row.tipo === tipo)?.id ?? null;
    const seleccionados = Object.values(selected);
    const cantTotal = seleccionados.reduce((sum, row) => sum + Number(row.cantidad || 0), 0);
    const gruposDelFiltro = useMemo(
        () => grupos.filter((grupo) => !filtroFamilia || grupo.id_familia === filtroFamilia),
        [grupos, filtroFamilia],
    );

    const paso1Ok = Boolean(tipo);
    const fotosOk = fotos.length > 0;
    const remitoOk = Boolean(datos.nroRemito.trim());
    const paso2Ok = (() => {
        if (!paso1Ok || !remitoOk || !fotosOk) return false;
        if (tipo === "Entrada") return Boolean(datos.destino);
        if (tipo === "Salida") {
            if (!datos.origen) return false;
            if (datos.esDevolucion === "si") return Boolean(datos.proveedor);
            return Boolean(datos.destino);
        }
        if (tipo === "Transferencia") return Boolean(datos.origen && datos.destino && datos.origen !== datos.destino);
        if (tipo === "Entrega_EPP") {
            return Boolean(datos.origen && datos.destino && datos.origen !== datos.destino && datos.tipoEntregaEpp && empleado);
        }
        return false;
    })();
    const paso3Ok = paso2Ok && seleccionados.length > 0 && seleccionados.every((row) => Number(row.cantidad) > 0);

    useEffect(() => {
        if (perfilLoading || !canWrite) return;
        let cancelled = false;
        setLoadingOpts(true);
        Promise.all([
            listTiposMovimiento(),
            listDepositosActivosOpciones(),
            perfil?.esAdministrador ? Promise.resolve([]) : listMisDepositosOpciones(),
            listProveedoresActivosOpciones(),
            listFamiliasOpciones(),
            listGruposOpciones(),
        ])
            .then(([tiposRows, deps, mine, provs, fams, grps]) => {
                if (cancelled) return;
                setTipos(tiposRows);
                setDepositos(deps);
                setMisDepositos(perfil?.esAdministrador ? deps : mine);
                setProveedores(provs);
                setFamilias(fams);
                setGrupos(grps);
            })
            .catch((err) => {
                if (!cancelled) notify(explainMovimientoError(err), "error");
            })
            .finally(() => {
                if (!cancelled) setLoadingOpts(false);
            });
        return () => { cancelled = true; };
    }, [canWrite, perfil?.esAdministrador, perfilLoading, notify]);

    useEffect(() => {
        const term = empleadoSearch.trim();
        if (!term || empleado) {
            setEmpleadoHits([]);
            return;
        }
        const timer = window.setTimeout(() => {
            listEmpleados(term).then(setEmpleadoHits).catch(() => setEmpleadoHits([]));
        }, 250);
        return () => window.clearTimeout(timer);
    }, [empleadoSearch, empleado]);

    useEffect(() => {
        const term = artSearchInput.trim();
        const timer = window.setTimeout(() => {
            if (term === artSearch) return;
            setArtPage(0);
            setArtSearch(term);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [artSearchInput, artSearch]);

    const needArticulos = (step === 2 || addOpen) && paso2Ok;
    useEffect(() => {
        if (!needArticulos) return;
        let cancelled = false;
        setArtLoading(true);
        listArticulosParaMovimiento({
            tipo,
            idDepositoOrigen: datos.origen || null,
            search: artSearch,
            idFamilia: filtroFamilia,
            idGrupo: filtroGrupo,
            page: artPage,
        })
            .then((result) => {
                if (cancelled) return;
                setArtRows(result.rows);
                setArtTotal(result.total);
            })
            .catch((err) => {
                if (!cancelled) notify(explainMovimientoError(err), "error");
            })
            .finally(() => {
                if (!cancelled) setArtLoading(false);
            });
        return () => { cancelled = true; };
    }, [needArticulos, tipo, datos.origen, artSearch, filtroFamilia, filtroGrupo, artPage, notify]);

    function goTo(next) {
        if (next <= step) {
            setStep(next);
            return;
        }
        if (next === 1 && paso1Ok) setStep(1);
        if (next === 2 && paso2Ok) setStep(2);
        if (next === 3 && paso3Ok) setStep(3);
    }

    function chooseTipo(nextTipo) {
        setTipo(nextTipo);
        setDatos((current) => ({ ...emptyDatos(), nroRemito: current.nroRemito }));
        setEmpleado(null);
        setSelected({});
        setFiltroFamilia("");
        setFiltroGrupo("");
        setArtPage(0);
        setError(null);
    }

    async function addFiles(fileList) {
        const files = [...fileList].filter((file) => file.type.startsWith("image/") || file.type === "application/pdf");
        if (!files.length) {
            setError("Solo se pueden adjuntar imágenes o PDF del remito.");
            return;
        }
        setError(null);
        try {
            const paths = await uploadFotosRemito(files);
            const urls = await signedUrlsRemito(paths);
            setFotos((current) => [...current, ...urls]);
        } catch (err) {
            setError(explainMovimientoError(err));
        }
    }

    function toggleArticulo(row, checked) {
        setSelected((current) => {
            const next = { ...current };
            if (!checked) {
                delete next[row.id];
                return next;
            }
            next[row.id] = {
                id: row.id,
                codigo: row.codigo,
                nombre: row.nombre,
                unidad_de_medida: row.unidad_de_medida,
                stock: row.stock,
                cantidad: current[row.id]?.cantidad ?? "",
                observacion: current[row.id]?.observacion ?? "",
            };
            return next;
        });
    }

    function updateLinea(id, patch) {
        setSelected((current) => ({
            ...current,
            [id]: { ...current[id], ...patch },
        }));
    }

    async function handleAltaEmpleado(event) {
        event.preventDefault();
        if (!altaEmpleado.nombre.trim() || !altaEmpleado.apellido.trim() || !altaEmpleado.dni.trim() || !altaEmpleado.email.trim()) {
            setError("Completá nombre, apellido, DNI y mail del empleado.");
            return;
        }
        try {
            const created = await createEmpleado(altaEmpleado);
            setEmpleado(created);
            setMostrarAltaEmpleado(false);
            setEmpleadoSearch("");
            setError(null);
            notify("Empleado dado de alta.", "success");
        } catch (err) {
            setError(explainMovimientoError(err));
        }
    }

    async function handleSubmit() {
        if (!paso3Ok) return;
        if (!idTipo) {
            setError("Falta el tipo de movimiento en la base. Pegá el SQL de movimientos en el SQL Editor.");
            return;
        }
        for (const row of seleccionados) {
            if (row.stock != null && Number(row.cantidad) > Number(row.stock)) {
                setError(`La cantidad de ${row.codigo} supera el stock (${row.stock}).`);
                return;
            }
        }
        setSaving(true);
        setError(null);
        try {
            const id = await crearMovimiento({
                idTipo,
                idDepositoOrigen: tipo === "Entrada" ? null : datos.origen,
                idDepositoDestino: tipo === "Salida" && datos.esDevolucion === "si" ? null : datos.destino,
                idProveedor: (tipo === "Entrada" || (tipo === "Salida" && datos.esDevolucion === "si"))
                    ? (datos.proveedor || null)
                    : null,
                esDevolucion: tipo === "Salida" && datos.esDevolucion === "si",
                motivo: tipo === "Transferencia" || tipo === "Entrega_EPP" ? datos.motivo : "",
                nroRemito: datos.nroRemito,
                fotosRemito: fotos.map((foto) => foto.path),
                articulos: seleccionados.map((row) => ({
                    id_articulo: row.id,
                    cantidad: Number(row.cantidad),
                    observacion: row.observacion,
                })),
                tipoEntregaEpp: tipo === "Entrega_EPP" ? datos.tipoEntregaEpp : null,
                idEmpleado: tipo === "Entrega_EPP" ? empleado?.id : null,
            });
            notify("Movimiento cargado.", "success");
            navigate(SPA_PATHS.movimientoDetalle(id));
        } catch (err) {
            setError(explainMovimientoError(err));
        } finally {
            setSaving(false);
        }
    }

    if (perfilLoading || loadingOpts) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!canWrite) {
        return (
            <section>
                <PageHeader title="Nuevo movimiento" description="Solo Administrador y Responsable de depósito pueden cargar movimientos." />
                <Alert>Tu usuario no puede cargar movimientos.</Alert>
            </section>
        );
    }

    const artPageCount = Math.max(1, Math.ceil(artTotal / ARTICULOS_MOVIMIENTO_PAGE_SIZE));

    return (
        <section>
            <PageHeader
                title="Nuevo movimiento"
                description="Completá cada paso. Podés volver atrás sin perder lo cargado."
                actions={
                    <Button variant="secondary" onClick={() => navigate(SPA_PATHS.movimientos)}>
                        <ArrowLeft size={18} strokeWidth={1.6} />
                        Volver
                    </Button>
                }
            />

            <ol className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {STEPS.map((label, index) => {
                    const done = index === 0 ? paso1Ok : index === 1 ? paso2Ok : index === 2 ? paso3Ok : paso3Ok && step === 3;
                    const enabled = index === 0 || (index === 1 && paso1Ok) || (index === 2 && paso2Ok) || (index === 3 && paso3Ok);
                    return (
                        <li key={label}>
                            <button
                                type="button"
                                disabled={!enabled}
                                onClick={() => goTo(index)}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-control border px-3 py-2 text-left text-sm",
                                    step === index
                                        ? "border-app-focus bg-app-subtle text-app-primary"
                                        : done
                                            ? "border-app-border bg-app-surface text-app-primary"
                                            : "border-app-border-subtle text-app-mutedtext",
                                )}
                            >
                                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", step === index || done ? "bg-app-accent text-app-accent-fg" : "bg-app-muted")}>
                                    {index + 1}
                                </span>
                                {label}
                            </button>
                        </li>
                    );
                })}
            </ol>

            {error ? <div className="mb-4"><Alert>{error}</Alert></div> : null}

            {step === 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Object.keys(TIPO_MOVIMIENTO).map((key) => {
                        const available = tipos.some((row) => row.tipo === key) || key !== "Entrega_EPP";
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => chooseTipo(key)}
                                className={cn(
                                    "rounded-card border p-4 text-left",
                                    tipo === key ? "border-app-focus bg-app-subtle" : "border-app-border bg-app-surface",
                                    !available && "opacity-60",
                                )}
                            >
                                <p className="font-semibold text-app-primary">{labelTipoMovimiento(key)}</p>
                                <p className="mt-1 text-sm text-app-mutedtext">
                                    {key === "Entrada" && "Ingreso de mercadería a un depósito."}
                                    {key === "Salida" && "Egreso desde un depósito. Puede ser devolución a proveedor."}
                                    {key === "Transferencia" && "Traspaso interno entre depósitos."}
                                    {key === "Entrega_EPP" && "Entrega de EPP a un empleado. Resta stock del origen."}
                                </p>
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {step === 1 ? (
                <Card>
                    <div className="space-y-4">
                        {tipo === "Entrada" ? (
                            <>
                                <SelectDeposito label="Depósito destino" value={datos.destino} options={origenes} onChange={(destino) => setDatos({ ...datos, destino })} />
                                <SelectProveedor label="Proveedor (opcional)" value={datos.proveedor} options={proveedores} onChange={(proveedor) => setDatos({ ...datos, proveedor })} allowEmpty />
                            </>
                        ) : null}
                        {tipo === "Salida" ? (
                            <>
                                <SelectDeposito label="Depósito origen" value={datos.origen} options={origenesFiltrados} onChange={(origen) => { setDatos({ ...datos, origen, destino: origen === datos.destino ? "" : datos.destino }); setSelected({}); }} />
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-app-secondarytext">¿Es devolución?</span>
                                    <select value={datos.esDevolucion} onChange={(event) => setDatos({ ...datos, esDevolucion: event.target.value, proveedor: event.target.value === "si" ? datos.proveedor : "" })} className={SELECT_CLASS}>
                                        <option value="no">No</option>
                                        <option value="si">Sí</option>
                                    </select>
                                </label>
                                {datos.esDevolucion === "si" ? (
                                    <SelectProveedor label="Proveedor" value={datos.proveedor} options={proveedores} onChange={(proveedor) => setDatos({ ...datos, proveedor })} />
                                ) : (
                                    <SelectDeposito label="Depósito destino" value={datos.destino} options={destinos} onChange={(destino) => setDatos({ ...datos, destino })} />
                                )}
                            </>
                        ) : null}
                        {tipo === "Transferencia" ? (
                            <>
                                <SelectDeposito label="Depósito origen" value={datos.origen} options={origenesFiltrados} onChange={(origen) => { setDatos({ ...datos, origen, destino: origen === datos.destino ? "" : datos.destino }); setSelected({}); }} />
                                <SelectDeposito label="Depósito destino" value={datos.destino} options={destinos} onChange={(destino) => setDatos({ ...datos, destino })} />
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-app-secondarytext">Motivo (opcional)</span>
                                    <textarea value={datos.motivo} onChange={(event) => setDatos({ ...datos, motivo: event.target.value })} rows={3} className={SELECT_CLASS} />
                                </label>
                            </>
                        ) : null}
                        {tipo === "Entrega_EPP" ? (
                            <>
                                <SelectDeposito label="Depósito origen" value={datos.origen} options={origenesFiltrados} onChange={(origen) => { setDatos({ ...datos, origen, destino: origen === datos.destino ? "" : datos.destino }); setSelected({}); }} />
                                <SelectDeposito label="Depósito destino" value={datos.destino} options={destinos} onChange={(destino) => setDatos({ ...datos, destino })} />
                                <SearchSelect
                                    label="Tipo de entrega"
                                    value={datos.tipoEntregaEpp}
                                    onChange={(tipoEntregaEpp) => setDatos({ ...datos, tipoEntregaEpp })}
                                    emptyOption="Elegí el tipo"
                                    placeholder="Buscar tipo…"
                                    options={Object.entries(TIPO_ENTREGA_EPP).map(([value, optionLabel]) => ({
                                        value,
                                        label: optionLabel,
                                    }))}
                                />
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-app-secondarytext">Observación (opcional)</span>
                                    <textarea value={datos.motivo} onChange={(event) => setDatos({ ...datos, motivo: event.target.value })} rows={2} className={SELECT_CLASS} />
                                </label>
                                <EmpleadoPicker
                                    empleado={empleado}
                                    search={empleadoSearch}
                                    hits={empleadoHits}
                                    alta={altaEmpleado}
                                    mostrarAlta={mostrarAltaEmpleado}
                                    onSearch={setEmpleadoSearch}
                                    onPick={(row) => { setEmpleado(row); setEmpleadoSearch(""); setMostrarAltaEmpleado(false); }}
                                    onClear={() => setEmpleado(null)}
                                    onAltaChange={setAltaEmpleado}
                                    onToggleAlta={() => setMostrarAltaEmpleado(true)}
                                    onAlta={handleAltaEmpleado}
                                />
                            </>
                        ) : null}

                        <Input label="Nro. remito" value={datos.nroRemito} onChange={(event) => setDatos({ ...datos, nroRemito: event.target.value })} required />
                        <RemitoFotos fotos={fotos} fileRef={fileRef} onFiles={addFiles} onRemove={(path) => setFotos((current) => current.filter((foto) => foto.path !== path))} />
                    </div>
                </Card>
            ) : null}

            {step === 2 ? (
                <ArticulosPicker
                    rows={artRows}
                    total={artTotal}
                    loading={artLoading}
                    search={artSearchInput}
                    onSearch={setArtSearchInput}
                    page={artPage}
                    pageCount={artPageCount}
                    onPage={setArtPage}
                    selected={selected}
                    onToggle={toggleArticulo}
                    onUpdate={updateLinea}
                    cantTotal={cantTotal}
                    catalogoCompleto={tipo === "Entrada"}
                    filtroFamilia={filtroFamilia}
                    filtroGrupo={filtroGrupo}
                    onFamilia={(next) => {
                        setArtPage(0);
                        setFiltroFamilia(next);
                        setFiltroGrupo("");
                    }}
                    onGrupo={(next) => {
                        setArtPage(0);
                        setFiltroGrupo(next);
                    }}
                    familias={familias}
                    grupos={gruposDelFiltro}
                />
            ) : null}

            {step === 3 ? (
                <div className="space-y-4">
                    <Card title={`Tipo: ${labelTipoMovimiento(tipo)}`}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {tipo !== "Entrada" ? (
                                <SelectDeposito label="Depósito origen" value={datos.origen} options={origenesFiltrados} onChange={(origen) => setDatos({ ...datos, origen })} />
                            ) : null}
                            {!(tipo === "Salida" && datos.esDevolucion === "si") ? (
                                <SelectDeposito label="Depósito destino" value={datos.destino} options={tipo === "Entrada" ? origenes : destinos} onChange={(destino) => setDatos({ ...datos, destino })} />
                            ) : null}
                            {tipo === "Entrada" || (tipo === "Salida" && datos.esDevolucion === "si") ? (
                                <SelectProveedor label={tipo === "Entrada" ? "Proveedor (opcional)" : "Proveedor"} value={datos.proveedor} options={proveedores} onChange={(proveedor) => setDatos({ ...datos, proveedor })} allowEmpty={tipo === "Entrada"} />
                            ) : null}
                            {tipo === "Salida" ? (
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-medium text-app-secondarytext">¿Es devolución?</span>
                                    <select value={datos.esDevolucion} onChange={(event) => setDatos({ ...datos, esDevolucion: event.target.value })} className={SELECT_CLASS}>
                                        <option value="no">No</option>
                                        <option value="si">Sí</option>
                                    </select>
                                </label>
                            ) : null}
                            {tipo === "Entrega_EPP" ? (
                                <>
                                    <SearchSelect
                                        label="Tipo de entrega"
                                        value={datos.tipoEntregaEpp}
                                        onChange={(tipoEntregaEpp) => setDatos({ ...datos, tipoEntregaEpp })}
                                        emptyOption="Elegí el tipo"
                                        placeholder="Buscar tipo…"
                                        options={Object.entries(TIPO_ENTREGA_EPP).map(([value, optionLabel]) => ({
                                            value,
                                            label: optionLabel,
                                        }))}
                                    />
                                    <p className="text-sm text-app-secondarytext">Empleado: {empleado ? `${empleado.nombre} ${empleado.apellido} · DNI ${empleado.dni}` : "—"}</p>
                                </>
                            ) : null}
                            {tipo === "Transferencia" || tipo === "Entrega_EPP" ? (
                                <label className="flex flex-col gap-1.5 sm:col-span-2">
                                    <span className="text-sm font-medium text-app-secondarytext">Motivo / observación</span>
                                    <textarea value={datos.motivo} onChange={(event) => setDatos({ ...datos, motivo: event.target.value })} rows={2} className={SELECT_CLASS} />
                                </label>
                            ) : null}
                        </div>
                        <div className="mt-4">
                            <Input label="Nro. remito" value={datos.nroRemito} onChange={(event) => setDatos({ ...datos, nroRemito: event.target.value })} />
                            <div className="mt-3">
                                <RemitoFotos
                                    fotos={fotos}
                                    fileRef={fileRef}
                                    onFiles={addFiles}
                                    onRemove={(path) => setFotos((current) => current.filter((foto) => foto.path !== path))}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-app-primary">Total de artículos: {cantTotal}</p>
                        <Button variant="secondary" onClick={() => setAddOpen(true)}>
                            <Plus size={16} strokeWidth={1.6} />
                            Agregar más
                        </Button>
                    </div>

                    <TableShell empty={seleccionados.length === 0 ? "No hay artículos seleccionados." : undefined}>
                        {seleccionados.length > 0 ? (
                            <table className="w-full min-w-[48rem] text-left text-sm">
                                <thead className="bg-app-muted text-app-mutedtext">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Código</th>
                                        <th className="px-4 py-3 font-semibold">Nombre</th>
                                        <th className="px-4 py-3 font-semibold">Cantidad</th>
                                        <th className="px-4 py-3 font-semibold">Observación</th>
                                        <th className="px-4 py-3 text-right font-semibold">Quitar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seleccionados.map((row, index) => (
                                        <TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle">
                                            <td className="px-4 py-3"><InternalCode>{row.codigo}</InternalCode></td>
                                            <td className="px-4 py-3">{row.nombre}</td>
                                            <td className="px-4 py-3">
                                                <input type="number" min="1" value={row.cantidad} onChange={(event) => updateLinea(row.id, { cantidad: event.target.value })} className="w-24 rounded-control border border-app-input px-2 py-1.5 text-sm" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input value={row.observacion} onChange={(event) => updateLinea(row.id, { observacion: event.target.value })} className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm" />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="table" aria-label={`Quitar ${row.nombre}`} onClick={() => toggleArticulo(row, false)}>
                                                    <X size={16} strokeWidth={1.7} />
                                                </Button>
                                            </td>
                                        </TableAppearRow>
                                    ))}
                                </tbody>
                            </table>
                        ) : null}
                    </TableShell>
                </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
                    <ChevronLeft size={16} strokeWidth={1.7} />
                    Anterior
                </Button>
                {step < 3 ? (
                    <Button
                        disabled={(step === 0 && !paso1Ok) || (step === 1 && !paso2Ok) || (step === 2 && !paso3Ok)}
                        onClick={() => setStep((current) => current + 1)}
                    >
                        Siguiente
                        <ChevronRight size={16} strokeWidth={1.7} />
                    </Button>
                ) : (
                    <Button disabled={!paso3Ok || saving} onClick={() => void handleSubmit()}>
                        {saving ? "Cargando…" : "Cargar movimiento"}
                    </Button>
                )}
            </div>

            <FormModal
                open={addOpen}
                title="Agregar artículos"
                onClose={() => setAddOpen(false)}
                className="max-w-4xl"
                footer={
                    <Button onClick={() => setAddOpen(false)}>Listo</Button>
                }
            >
                <ArticulosPicker
                    compact
                    rows={artRows}
                    total={artTotal}
                    loading={artLoading}
                    search={artSearchInput}
                    onSearch={setArtSearchInput}
                    page={artPage}
                    pageCount={artPageCount}
                    onPage={setArtPage}
                    selected={selected}
                    onToggle={toggleArticulo}
                    onUpdate={updateLinea}
                    cantTotal={cantTotal}
                    catalogoCompleto={tipo === "Entrada"}
                    filtroFamilia={filtroFamilia}
                    filtroGrupo={filtroGrupo}
                    onFamilia={(next) => {
                        setArtPage(0);
                        setFiltroFamilia(next);
                        setFiltroGrupo("");
                    }}
                    onGrupo={(next) => {
                        setArtPage(0);
                        setFiltroGrupo(next);
                    }}
                    familias={familias}
                    grupos={gruposDelFiltro}
                />
            </FormModal>
        </section>
    );
}

function SelectDeposito({ label, value, options, onChange }) {
    return (
        <SearchSelect
            label={label}
            value={value}
            onChange={onChange}
            emptyOption="Elegí un depósito"
            placeholder="Buscar depósito…"
            options={options.map((dep) => ({
                value: dep.id,
                label: `${dep.codigo} – ${dep.nombre}`,
            }))}
        />
    );
}

function SelectProveedor({ label, value, options, onChange, allowEmpty = false }) {
    return (
        <SearchSelect
            label={label}
            value={value}
            onChange={onChange}
            emptyOption={allowEmpty ? "Sin proveedor" : "Elegí un proveedor"}
            placeholder="Buscar proveedor…"
            options={options.map((row) => ({
                value: row.id,
                label: row.etiqueta,
            }))}
        />
    );
}

function RemitoFotos({ fotos, fileRef, onFiles, onRemove }) {
    return (
        <div>
            <p className="mb-1.5 text-sm font-medium text-app-secondarytext">Fotos del remito</p>
            <div
                className="rounded-control border border-dashed border-app-input bg-app-muted p-4 text-center text-sm text-app-mutedtext"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                    event.preventDefault();
                    void onFiles(event.dataTransfer.files);
                }}
            >
                Arrastrá las fotos o
                <button type="button" className="mx-1 underline" onClick={() => fileRef.current?.click()}>seleccioná archivos</button>
                <span className="inline-flex items-center gap-1">
                    ·
                    <Camera size={14} strokeWidth={1.7} />
                    se puede tomar foto del remito
                </span>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        void onFiles(event.target.files ?? []);
                        event.target.value = "";
                    }}
                />
            </div>
            {fotos.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {fotos.map((foto) => (
                        <div key={foto.path} className="relative overflow-hidden rounded-control border border-app-border">
                            {foto.url ? <img src={foto.url} alt="Remito" className="h-28 w-full object-cover" /> : <p className="p-3 text-xs">{foto.path}</p>}
                            <button type="button" aria-label="Quitar foto" className="absolute right-1 top-1 rounded-full bg-white/90 p-1" onClick={() => onRemove(foto.path)}>
                                <X size={14} strokeWidth={1.8} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function EmpleadoPicker({ empleado, search, hits, alta, mostrarAlta, onSearch, onPick, onClear, onAltaChange, onToggleAlta, onAlta }) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-app-secondarytext">Empleado</p>
            {empleado ? (
                <div className="flex items-center justify-between rounded-control border border-app-border bg-app-muted px-3 py-2 text-sm">
                    <span>{empleado.nombre} {empleado.apellido} · DNI {empleado.dni} · {empleado.email}</span>
                    <Button variant="table" onClick={onClear}><X size={16} /></Button>
                </div>
            ) : (
                <>
                    <label className="relative block">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por nombre, apellido o DNI" className="w-full rounded-control border border-app-input py-2 pl-9 pr-3 text-sm" />
                    </label>
                    {hits.length > 0 ? (
                        <ul className="max-h-48 overflow-auto rounded-control border border-app-border bg-app-surface">
                            {hits.map((row) => (
                                <li key={row.id}>
                                    <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-app-subtle" onClick={() => onPick(row)}>
                                        {row.nombre} {row.apellido} · DNI {row.dni} · {row.email}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : search.trim() ? (
                        <p className="text-sm text-app-mutedtext">No está. Dalo de alta con nombre, apellido, DNI y mail.</p>
                    ) : null}
                    <Button variant="secondary" onClick={onToggleAlta}>Alta de empleado</Button>
                    {mostrarAlta ? (
                        <form className="grid gap-2 sm:grid-cols-2" onSubmit={onAlta}>
                            <Input label="Nombre" value={alta.nombre} onChange={(event) => onAltaChange({ ...alta, nombre: event.target.value })} required />
                            <Input label="Apellido" value={alta.apellido} onChange={(event) => onAltaChange({ ...alta, apellido: event.target.value })} required />
                            <Input label="DNI" value={alta.dni} onChange={(event) => onAltaChange({ ...alta, dni: event.target.value })} required />
                            <Input label="Mail" type="email" value={alta.email} onChange={(event) => onAltaChange({ ...alta, email: event.target.value })} required />
                            <div className="sm:col-span-2">
                                <Button type="submit">Crear empleado</Button>
                            </div>
                        </form>
                    ) : null}
                </>
            )}
        </div>
    );
}

function ArticulosPicker({
    rows,
    total,
    loading,
    search,
    onSearch,
    page,
    pageCount,
    onPage,
    selected,
    onToggle,
    onUpdate,
    cantTotal,
    compact = false,
    catalogoCompleto = false,
    filtroFamilia = "",
    filtroGrupo = "",
    onFamilia,
    onGrupo,
    familias = [],
    grupos = [],
}) {
    return (
        <div className="space-y-3">
            {catalogoCompleto ? (
                <p className="text-sm text-app-mutedtext">
                    En una entrada podés elegir cualquier artículo activo del catálogo, no solo los que ya están en tus depósitos.
                </p>
            ) : null}
            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                <label className="relative block min-w-[12rem] flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                    <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por código o nombre" className="w-full rounded-control border border-app-input py-2 pl-9 pr-3 text-sm" />
                </label>
                <SearchSelect
                    value={filtroFamilia}
                    onChange={onFamilia}
                    emptyOption="Todas las familias"
                    placeholder="Buscar familia…"
                    className="w-full lg:w-64"
                    options={familias.map((familia) => ({
                        value: familia.id,
                        label: formatFamiliaGrupo(familia.codigo, familia.descripcion),
                    }))}
                />
                <SearchSelect
                    value={filtroGrupo}
                    onChange={onGrupo}
                    disabled={!filtroFamilia}
                    emptyOption="Todos los grupos"
                    placeholder="Buscar grupo…"
                    className="w-full lg:w-64"
                    options={grupos.map((grupo) => ({
                        value: grupo.id,
                        label: formatFamiliaGrupo(grupo.codigo, grupo.descripcion),
                    }))}
                />
                <p className="text-sm text-app-mutedtext lg:ml-auto">Seleccionados: {Object.keys(selected).length} · Cantidad total: {cantTotal}</p>
            </div>
            <TableShell empty={!loading && rows.length === 0 ? (catalogoCompleto ? "No hay artículos que coincidan con la búsqueda." : "No hay artículos con stock en este depósito o búsqueda.") : undefined}>
                {loading ? (
                    <TableGhost minWidth={compact ? "40rem" : "56rem"} columns={[{ label: "Sel." }, { label: "Código" }, { label: "Nombre" }, { label: "Unidad" }, { label: "Cantidad" }, { label: "Observación" }]} />
                ) : rows.length > 0 ? (
                    <table className="w-full min-w-[48rem] text-left text-sm">
                        <thead className="bg-app-muted text-app-mutedtext">
                            <tr>
                                <th className="px-3 py-3 font-semibold">Sel.</th>
                                <th className="px-3 py-3 font-semibold">Código</th>
                                <th className="px-3 py-3 font-semibold">Nombre</th>
                                <th className="px-3 py-3 font-semibold">Unidad</th>
                                <th className="px-3 py-3 font-semibold">Cantidad</th>
                                <th className="px-3 py-3 font-semibold">Observación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const checked = Boolean(selected[row.id]);
                                const linea = selected[row.id];
                                return (
                                    <TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                                        <td className="px-3 py-2">
                                            <input type="checkbox" checked={checked} onChange={(event) => onToggle(row, event.target.checked)} />
                                        </td>
                                        <td className="px-3 py-2"><InternalCode>{row.codigo}</InternalCode></td>
                                        <td className="px-3 py-2">
                                            <p className="font-medium text-app-primary">{row.nombre}</p>
                                            {row.familia_codigo ? (
                                                <p className="text-xs text-app-mutedtext">{formatFamiliaGrupo(row.familia_codigo, row.familia_descripcion)}</p>
                                            ) : null}
                                            {row.stock != null ? <p className="text-xs text-app-mutedtext">Stock: {row.stock}</p> : null}
                                        </td>
                                        <td className="px-3 py-2">{row.unidad_de_medida}</td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                disabled={!checked}
                                                value={linea?.cantidad ?? ""}
                                                onChange={(event) => onUpdate(row.id, { cantidad: event.target.value })}
                                                className="w-24 rounded-control border border-app-input px-2 py-1.5 text-sm disabled:opacity-50"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                disabled={!checked}
                                                value={linea?.observacion ?? ""}
                                                onChange={(event) => onUpdate(row.id, { observacion: event.target.value })}
                                                className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm disabled:opacity-50"
                                            />
                                        </td>
                                    </TableAppearRow>
                                );
                            })}
                        </tbody>
                    </table>
                ) : null}
            </TableShell>
            {artTotalVisible(total) ? (
                <div className="flex items-center justify-end gap-2">
                    <Button variant="secondary" disabled={loading || page === 0} onClick={() => onPage((current) => Math.max(0, current - 1))}>Anterior</Button>
                    <span className="text-sm text-app-secondarytext">Página {page + 1} de {pageCount}</span>
                    <Button variant="secondary" disabled={loading || page + 1 >= pageCount} onClick={() => onPage((current) => current + 1)}>Siguiente</Button>
                </div>
            ) : null}
        </div>
    );
}

function artTotalVisible(total) {
    return total > ARTICULOS_MOVIMIENTO_PAGE_SIZE;
}
