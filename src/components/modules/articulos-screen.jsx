import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Download, History, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/components/modals/confirm-dialog";
import { FormModal } from "@/components/modals/form-modal";
import { Alert } from "@/components/ui/alert";
import { Badge, EstadoBadge, EstadoSelect, InternalCode } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import {
    ARTICULOS_PAGE_SIZE,
    createArticulo,
    desactivarArticulo,
    eliminarArticulo,
    explainArticuloError,
    findArticuloPorCodigo,
    fraseMovimientosArticulo,
    listArticulosExport,
    listArticulosPagina,
    listArticulosPorDeposito,
    listArticulosPorDepositos,
    listDepositosOpciones,
    listFamiliasOpciones,
    listGruposOpciones,
    nextArticuloCodigoSugerido,
    resumenMovimientosArticulo,
    updateArticulo,
    upsertArticulos,
} from "@/services/articulos";
import { listDepositosPropios } from "@/services/depositos";
import { listFamiliasResumen } from "@/services/familias";
import { downloadArticulosExcel, downloadArticulosPorDepositosExcel, downloadArticulosPorFamiliasExcel, excelSheetLabel, parseArticulosExcel } from "@/utils/excel-articulos";
import { cn } from "@/utils/cn";
import { formatCurrency, formatFamiliaGrupo } from "@/utils/format";
import { hintCodigoUnico, mensajeArticuloCodigoOcupado } from "@/utils/codigo-unico";
import { SPA_PATHS } from "@/utils/routes";

function SortButton({ label, active, dir, align = "left", onClick }) {
    const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
    return (
        <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 font-semibold ${align === "right" ? "w-full justify-end" : ""}`}>
            {label}
            <Icon size={14} strokeWidth={1.8} className="text-app-faint" />
        </button>
    );
}

function emptyCreate() {
    return {
        codigo: "",
        nombre: "",
        unidad_de_medida: "",
        id_familia: "",
        id_grupo: "",
        is_epp: false,
        costo: "",
    };
}

function FamiliaGrupoSelects({ familias, grupos, idFamilia, idGrupo, onFamilia, onGrupo, onlyActivos = false }) {
    const gruposFiltrados = grupos.filter((g) => g.id_familia === idFamilia && (!onlyActivos || g.estado === "activo"));
    const familiasVisibles = onlyActivos ? familias.filter((f) => f.estado === "activo") : familias;
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            <SearchSelect
                value={idFamilia ?? ""}
                onChange={onFamilia}
                emptyOption="Sin familia"
                placeholder="Buscar familia…"
                options={familiasVisibles.map((f) => ({
                    value: f.id,
                    label: formatFamiliaGrupo(f.codigo, f.descripcion),
                }))}
            />
            <SearchSelect
                value={idGrupo ?? ""}
                onChange={onGrupo}
                disabled={!idFamilia}
                emptyOption="Sin grupo"
                placeholder="Buscar grupo…"
                options={gruposFiltrados.map((g) => ({
                    value: g.id,
                    label: formatFamiliaGrupo(g.codigo, g.descripcion),
                }))}
            />
        </div>
    );
}

function ExcelFormatoCampos({
    mode,
    onModeChange,
    depositoId,
    onDepositoChange,
    familiaId,
    onFamiliaChange,
    grupoId,
    onGrupoChange,
    depositos,
    familias,
    grupos,
    variant = "download",
    emptyDepositoMessage = "No hay depósitos con artículos para descargar.",
}) {
    const esCarga = variant === "upload";
    const deposito = depositos.find((item) => item.id === depositoId) ?? null;
    const familia = familias.find((item) => item.id === familiaId) ?? null;
    let hint = esCarga ? "Se lee la hoja Artículos." : "";
    if (mode === "deposito") {
        hint = deposito
            ? (esCarga
                ? `Se busca la hoja “${deposito.codigo} – ${deposito.nombre}”.`
                : "La planilla se llama con el código y el nombre de ese depósito.")
            : (esCarga
                ? "Se lee la hoja Depósitos y una planilla por cada depósito."
                : "Se arma una hoja Depósitos y una planilla por cada depósito (código y nombre).");
    } else if (mode === "familia") {
        hint = familia
            ? (esCarga
                ? `Se busca la hoja “${formatFamiliaGrupo(familia.codigo, familia.descripcion)}”.`
                : "La planilla se llama con el código y la descripción de esa familia.")
            : (esCarga
                ? "Se lee la hoja Familias y una planilla por cada código de familia."
                : "Se arma una hoja Familias y una planilla por cada código de familia.");
    }
    return (
        <div className="space-y-3">
            <select
                value={mode}
                onChange={(event) => onModeChange(event.target.value)}
                className="w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"
            >
                <option value="todos">Todos los artículos</option>
                <option value="deposito">Por depósito</option>
                <option value="familia">Por familia / grupo</option>
            </select>
            {mode === "deposito" ? (
                depositos.length ? (
                    <SearchSelect
                        value={depositoId}
                        onChange={onDepositoChange}
                        emptyOption="Todos los depósitos"
                        placeholder="Buscar depósito…"
                        options={depositos.map((item) => ({
                            value: item.id,
                            label: `${item.codigo} – ${item.nombre}`,
                        }))}
                    />
                ) : (
                    <p className="text-sm text-app-mutedtext">{emptyDepositoMessage}</p>
                )
            ) : null}
            {mode === "familia" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                    <SearchSelect
                        value={familiaId}
                        onChange={(next) => {
                            onFamiliaChange(next);
                            onGrupoChange("");
                        }}
                        emptyOption="Todas las familias"
                        placeholder="Buscar familia…"
                        options={familias.map((item) => ({
                            value: item.id,
                            label: formatFamiliaGrupo(item.codigo, item.descripcion),
                        }))}
                    />
                    <SearchSelect
                        value={grupoId}
                        onChange={onGrupoChange}
                        disabled={!familiaId}
                        emptyOption="Todos los grupos"
                        placeholder="Buscar grupo…"
                        options={grupos.filter((item) => item.id_familia === familiaId).map((item) => ({
                            value: item.id,
                            label: formatFamiliaGrupo(item.codigo, item.descripcion),
                        }))}
                    />
                </div>
            ) : null}
            {hint ? <p className="text-xs text-app-mutedtext">{hint}</p> : null}
        </div>
    );
}

export function ArticulosScreen() {
    const navigate = useNavigate();
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [familias, setFamilias] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [depositos, setDepositos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [filtroFamilia, setFiltroFamilia] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const [filtroEpp, setFiltroEpp] = useState("todos");
    const [sort, setSort] = useState({ key: "codigo", dir: "asc" });
    const [suggestedCode, setSuggestedCode] = useState("001");
    const [createCodeOwner, setCreateCodeOwner] = useState(null);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [create, setCreate] = useState(emptyCreate());
    const [createError, setCreateError] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [deleteResumen, setDeleteResumen] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [uploadMode, setUploadMode] = useState("todos");
    const [uploadDeposito, setUploadDeposito] = useState("");
    const [uploadFamilia, setUploadFamilia] = useState("");
    const [uploadGrupo, setUploadGrupo] = useState("");
    const [dragging, setDragging] = useState(false);
    const [downloadOpen, setDownloadOpen] = useState(false);
    const [downloadMode, setDownloadMode] = useState("todos");
    const [downloadDeposito, setDownloadDeposito] = useState("");
    const [downloadFamilia, setDownloadFamilia] = useState("");
    const [downloadGrupo, setDownloadGrupo] = useState("");
    const [downloading, setDownloading] = useState(false);
    const fileInputRef = useRef(null);

    const isAdmin = Boolean(perfil?.esAdministrador);
    const isResponsable = Boolean(perfil?.esResponsableDeposito) && !isAdmin;
    const canView = isAdmin || Boolean(perfil?.esVistaDescarga) || isResponsable;
    const canWrite = isAdmin;
    const canHistorial = isAdmin || Boolean(perfil?.esVistaDescarga) || isResponsable;
    const showActions = canWrite || canHistorial;
    const soloMisDepositos = isResponsable;
    const depositosConArchivos = useMemo(
        () => depositos.filter((dep) => Number(dep.cant_articulos ?? 0) > 0 && (dep.estado === "activo" || isAdmin)),
        [depositos, isAdmin],
    );
    const depositosCarga = useMemo(
        () => depositos.filter((dep) => dep.estado === "activo" || isAdmin),
        [depositos, isAdmin],
    );

    const listFiltros = useMemo(() => ({
        search,
        idFamilia: filtroFamilia,
        idGrupo: filtroGrupo,
        epp: filtroEpp,
        sort,
    }), [search, filtroFamilia, filtroGrupo, filtroEpp, sort]);

    async function reloadOpciones() {
        const [fams, grps, deps] = await Promise.all([
            listFamiliasOpciones(),
            listGruposOpciones(),
            isResponsable ? listDepositosPropios() : listDepositosOpciones(),
        ]);
        setFamilias(fams);
        setGrupos(grps);
        setDepositos(deps);
    }

    async function reloadPagina(nextPage = page) {
        const result = await listArticulosPagina({
            ...listFiltros,
            page: nextPage,
            soloMisDepositos,
        });
        const lastPage = Math.max(0, Math.ceil(result.total / ARTICULOS_PAGE_SIZE) - 1);
        if (nextPage > lastPage && result.total > 0) {
            const again = await listArticulosPagina({ ...listFiltros, page: lastPage, soloMisDepositos });
            setRows(again.rows);
            setTotal(again.total);
            setPage(lastPage);
            return;
        }
        setRows(result.rows);
        setTotal(result.total);
    }

    useEffect(() => {
        const term = searchInput.trim();
        const timer = window.setTimeout(() => {
            if (term === search) return;
            setPage(0);
            setSearch(term);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchInput, search]);

    useEffect(() => {
        if (perfilLoading || !canView) return;
        let cancelled = false;
        reloadOpciones().catch((error) => {
            if (!cancelled) notify(explainArticuloError(error), "error");
        });
        return () => { cancelled = true; };
    }, [canView, isResponsable, perfilLoading, notify]);

    useEffect(() => {
        if (perfilLoading) return;
        if (!canView) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        reloadPagina(page)
            .catch((error) => notify(explainArticuloError(error), "error"))
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [canView, perfilLoading, notify, page, listFiltros]);

    useEffect(() => {
        if (!createOpen) {
            setCreateCodeOwner(null);
            return;
        }
        const code = create.codigo.trim();
        if (!code) {
            setCreateCodeOwner(null);
            return;
        }
        const timer = window.setTimeout(() => {
            findArticuloPorCodigo(code)
                .then(setCreateCodeOwner)
                .catch(() => setCreateCodeOwner(null));
        }, 300);
        return () => window.clearTimeout(timer);
    }, [create.codigo, createOpen]);

    useEffect(() => {
        if (!toDelete) {
            setDeleteResumen(null);
            return;
        }
        let cancelled = false;
        setDeleteResumen(null);
        resumenMovimientosArticulo(toDelete.id)
            .then((resumen) => {
                if (!cancelled) setDeleteResumen(resumen);
            })
            .catch(() => {
                if (!cancelled) setDeleteResumen({ total: 0, porTipo: [], unknown: true });
            });
        return () => {
            cancelled = true;
        };
    }, [toDelete]);

    const gruposDelFiltro = useMemo(
        () => grupos.filter((g) => !filtroFamilia || g.id_familia === filtroFamilia),
        [grupos, filtroFamilia],
    );
    const pageCount = Math.max(1, Math.ceil(total / ARTICULOS_PAGE_SIZE));
    const fromRow = total === 0 ? 0 : page * ARTICULOS_PAGE_SIZE + 1;
    const toRow = Math.min(total, (page + 1) * ARTICULOS_PAGE_SIZE);

    function toggleSort(key) {
        setPage(0);
        setSort((current) => (
            current.key === key
                ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
                : { key, dir: key === "costo" ? "desc" : "asc" }
        ));
    }

    async function openCreate() {
        setCreateError(null);
        setCreate(emptyCreate());
        setCreateOpen(true);
        try {
            const codigo = await nextArticuloCodigoSugerido();
            setSuggestedCode(codigo);
            setCreate((current) => (current.codigo ? current : { ...current, codigo }));
        } catch {
            setSuggestedCode("001");
        }
    }

    async function handleCreate(event) {
        event.preventDefault();
        setCreateError(null);
        if (!create.codigo.trim() || !create.nombre.trim() || !create.unidad_de_medida.trim()) {
            setCreateError("Completá código, nombre y unidad.");
            return;
        }
        const owner = createCodeOwner ?? await findArticuloPorCodigo(create.codigo);
        if (owner) {
            setCreateError(mensajeArticuloCodigoOcupado(owner, create.codigo));
            return;
        }
        setSaving(true);
        try {
            await createArticulo({
                ...create,
                id_grupo: create.id_grupo || null,
            });
            await reloadPagina(0);
            setPage(0);
            setCreateOpen(false);
            notify("Artículo cargado.", "success");
        } catch (error) {
            setCreateError(explainArticuloError(error));
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveEdit() {
        if (!draft) return;
        if (!draft.codigo.trim() || !draft.nombre.trim() || !draft.unidad_de_medida.trim()) {
            notify("Completá código, nombre y unidad.", "error");
            return;
        }
        const owner = await findArticuloPorCodigo(draft.codigo, draft.id);
        if (owner) {
            notify(mensajeArticuloCodigoOcupado(owner, draft.codigo), "error");
            return;
        }
        if (draft.reemplazarCosto && (draft.nuevoCosto === "" || Number(draft.nuevoCosto) < 0)) {
            notify("Ingresá el costo nuevo o cancelá el cambio de precio.", "error");
            return;
        }
        setSaving(true);
        try {
            await updateArticulo(draft.id, {
                ...draft,
                id_grupo: draft.id_grupo || null,
                nuevoCosto: draft.reemplazarCosto ? draft.nuevoCosto : "",
            });
            await reloadPagina(page);
            setDraft(null);
            notify("Artículo actualizado.", "success");
        } catch (error) {
            notify(explainArticuloError(error), "error");
        } finally {
            setSaving(false);
        }
    }

    const deleteTieneMovimientos = Boolean(deleteResumen && !deleteResumen.unknown && deleteResumen.total > 0);
    const deleteYaInactivo = toDelete?.estado === "inactivo";
    const deleteChecking = Boolean(toDelete) && deleteResumen === null;
    const deleteFraseMovimientos = fraseMovimientosArticulo(deleteResumen);
    const deleteDescription = !toDelete
        ? ""
        : deleteChecking
            ? `Revisando si “${toDelete.codigo} – ${toDelete.nombre}” tiene movimientos…`
            : deleteTieneMovimientos
                ? (
                    deleteYaInactivo
                        ? `“${toDelete.codigo} – ${toDelete.nombre}” tiene ${deleteFraseMovimientos} en el historial, por eso no se puede eliminar. Ya está inactivo: no se pueden hacer más movimientos con él.`
                        : `“${toDelete.codigo} – ${toDelete.nombre}” tiene ${deleteFraseMovimientos} en el historial, por eso no se puede eliminar. Si confirmás, se desactiva y ya no se van a poder hacer más movimientos con él. El historial se conserva.`
                )
                : `Si confirmás, se elimina “${toDelete.codigo} – ${toDelete.nombre}” de forma permanente. No hay vuelta atrás.`;

    async function handleDelete() {
        if (!toDelete || deleteChecking) return;
        if (deleteTieneMovimientos && deleteYaInactivo) {
            setToDelete(null);
            return;
        }
        setSaving(true);
        try {
            if (deleteTieneMovimientos) {
                await desactivarArticulo(toDelete);
                await reloadPagina(page);
                setToDelete(null);
                if (draft?.id === toDelete.id) setDraft(null);
                notify("Artículo desactivado. Ya no se puede usar en movimientos nuevos.", "success");
                return;
            }
            await eliminarArticulo(toDelete.id);
            await reloadPagina(page);
            setToDelete(null);
            if (draft?.id === toDelete.id) setDraft(null);
            notify("Artículo eliminado.", "success");
        } catch (error) {
            notify(explainArticuloError(error), "error");
        } finally {
            setSaving(false);
        }
    }

    function takeFile(file) {
        if (!file) return;
        setUploadFile(file);
        setUploadError(null);
    }

    async function handleUpload() {
        if (!uploadFile) {
            setUploadError("Seleccioná un Excel.");
            return;
        }
        setSaving(true);
        setUploadError(null);
        try {
            const buffer = await uploadFile.arrayBuffer();
            const fam = familias.find((item) => item.id === uploadFamilia);
            const grupo = grupos.find((item) => item.id === uploadGrupo);
            const dep = depositos.find((item) => item.id === uploadDeposito);
            const filas = parseArticulosExcel(buffer, {
                mode: uploadMode,
                familiaCodigo: uploadMode === "familia" ? (fam?.codigo ?? "") : "",
                familiaDescripcion: uploadMode === "familia" ? (fam?.descripcion ?? "") : "",
                grupoCodigo: uploadMode === "familia" ? (grupo?.codigo ?? "") : "",
                depositoCodigo: uploadMode === "deposito" ? (dep?.codigo ?? "") : "",
                depositoNombre: uploadMode === "deposito" ? (dep?.nombre ?? "") : "",
            });
            let existentes = [];
            if (uploadMode === "deposito") {
                existentes = uploadDeposito
                    ? await listArticulosPorDeposito(uploadDeposito)
                    : await listArticulosPorDepositos(depositosCarga.map((item) => item.id));
            } else {
                existentes = await listArticulosExport({
                    idFamilia: uploadMode === "familia" ? uploadFamilia : "",
                    idGrupo: uploadMode === "familia" ? uploadGrupo : "",
                });
            }
            let alcanceLabel = "todos los artículos";
            if (uploadMode === "familia") {
                alcanceLabel = fam
                    ? (grupo
                        ? `${formatFamiliaGrupo(fam.codigo, fam.descripcion)} / ${formatFamiliaGrupo(grupo.codigo, grupo.descripcion)}`
                        : formatFamiliaGrupo(fam.codigo, fam.descripcion))
                    : "todas las familias";
            } else if (uploadMode === "deposito") {
                alcanceLabel = dep ? `${dep.codigo} – ${dep.nombre}` : "todos los depósitos";
            }
            const result = await upsertArticulos(filas, { existentes, alcanceLabel });
            await reloadPagina(0);
            setPage(0);
            setUploadOpen(false);
            notify(result.mensaje, "success");
        } catch (error) {
            setUploadError(explainArticuloError(error));
        } finally {
            setSaving(false);
        }
    }

    async function familiasParaExcel(articulos) {
        let resumen = [];
        try {
            resumen = await listFamiliasResumen();
        } catch {
            const unique = new Map();
            for (const row of articulos) {
                const codigo = String(row.familia_codigo ?? "").trim();
                if (!codigo || unique.has(codigo.toLowerCase())) continue;
                unique.set(codigo.toLowerCase(), {
                    codigo,
                    descripcion: row.familia_descripcion ?? "",
                });
            }
            resumen = [...unique.values()];
        }
        if (!soloMisDepositos) return resumen;
        const presentes = new Set(
            articulos.map((row) => String(row.familia_codigo ?? "").trim().toLowerCase()).filter(Boolean),
        );
        return resumen.filter((familia) => presentes.has(String(familia.codigo).toLowerCase()));
    }

    async function handleDownload() {
        if (downloading) return;
        if (downloadMode === "deposito" && !depositosConArchivos.length) {
            notify("No hay depósitos con artículos para descargar.", "error");
            return;
        }
        setDownloading(true);
        try {
            if (downloadMode === "deposito") {
                if (downloadDeposito) {
                    const dep = depositos.find((d) => d.id === downloadDeposito);
                    const data = await listArticulosPorDeposito(downloadDeposito);
                    const sheetName = excelSheetLabel(dep?.codigo, dep?.nombre);
                    downloadArticulosExcel(data, `articulos-${dep?.codigo ?? "deposito"}.xlsx`, ["CANTIDAD"], sheetName);
                } else {
                    const articulos = await listArticulosPorDepositos(depositosConArchivos.map((dep) => dep.id));
                    if (!articulos.length) {
                        notify("No hay artículos en esos depósitos.", "error");
                        return;
                    }
                    downloadArticulosPorDepositosExcel(
                        { depositos: depositosConArchivos, articulos },
                        "articulos-depositos.xlsx",
                    );
                }
            } else if (downloadMode === "familia") {
                const articulos = await listArticulosExport({
                    idFamilia: downloadFamilia,
                    idGrupo: downloadGrupo,
                    soloMisDepositos,
                });
                if (downloadFamilia) {
                    const fam = familias.find((item) => item.id === downloadFamilia);
                    const sheetName = excelSheetLabel(
                        fam?.codigo ?? articulos[0]?.familia_codigo,
                        fam?.descripcion ?? articulos[0]?.familia_descripcion,
                    );
                    downloadArticulosExcel(
                        articulos,
                        `articulos-${fam?.codigo ?? "familia"}.xlsx`,
                        [],
                        sheetName,
                    );
                } else {
                    const resumen = await familiasParaExcel(articulos);
                    downloadArticulosPorFamiliasExcel({ familias: resumen, articulos }, "articulos-familias.xlsx");
                }
            } else {
                const articulos = await listArticulosExport({ soloMisDepositos });
                downloadArticulosExcel(articulos, "articulos.xlsx");
            }
            setDownloadOpen(false);
            notify("Excel descargado.", "success");
        } catch (error) {
            notify(explainArticuloError(error), "error");
        } finally {
            setDownloading(false);
        }
    }

    if (perfilLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!canView) {
        return (
            <section>
                <PageHeader title="Artículos" description="No tenés permiso para ver el catálogo." />
                <Alert>Tu usuario no puede ver artículos.</Alert>
            </section>
        );
    }

    return (
        <section>
            <PageHeader
                title="Artículos"
                description={
                    canWrite
                        ? "Catálogo con familia, grupo, EPP y costo. El estado se cambia con Editar."
                        : perfil?.esResponsableDeposito
                            ? "Artículos de tus depósitos. Solo consulta y descarga."
                            : "Consulta y descarga del catálogo. No se puede crear ni editar."
                }
                actions={
                    <>
                        <Button variant="secondary" className="w-full lg:w-auto" onClick={() => setDownloadOpen(true)} disabled={loading}>
                            <Download size={18} strokeWidth={1.6} />
                            Descargar archivos
                        </Button>
                        {canWrite ? (
                            <>
                                <Button
                                    variant="secondary"
                                    className="w-full lg:w-auto"
                                    onClick={() => {
                                        setUploadError(null);
                                        setUploadFile(null);
                                        setUploadMode("todos");
                                        setUploadDeposito("");
                                        setUploadFamilia("");
                                        setUploadGrupo("");
                                        setUploadOpen(true);
                                    }}
                                >
                                    <Upload size={18} strokeWidth={1.6} />
                                    Carga masiva
                                </Button>
                                <Button className="w-full lg:w-auto" onClick={() => void openCreate()}>
                                    <Plus size={18} strokeWidth={1.6} />
                                    Cargar artículo
                                </Button>
                            </>
                        ) : null}
                    </>
                }
            />

            <TableShell
                toolbar={
                    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
                        <label className="relative block min-w-[12rem] flex-1">
                            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                            <input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Buscar por nombre o código"
                                className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                            />
                        </label>
                        <SearchSelect
                            value={filtroFamilia}
                            onChange={(next) => {
                                setPage(0);
                                setFiltroFamilia(next);
                                setFiltroGrupo("");
                            }}
                            emptyOption="Todas las familias"
                            placeholder="Buscar familia…"
                            className="w-full lg:w-64"
                            options={familias.map((f) => ({
                                value: f.id,
                                label: formatFamiliaGrupo(f.codigo, f.descripcion),
                            }))}
                        />
                        <SearchSelect
                            value={filtroGrupo}
                            onChange={(next) => {
                                setPage(0);
                                setFiltroGrupo(next);
                            }}
                            disabled={!filtroFamilia}
                            emptyOption="Todos los grupos"
                            placeholder="Buscar grupo…"
                            className="w-full lg:w-64"
                            options={gruposDelFiltro.map((g) => ({
                                value: g.id,
                                label: formatFamiliaGrupo(g.codigo, g.descripcion),
                            }))}
                        />
                        <select
                            value={filtroEpp}
                            onChange={(event) => {
                                setPage(0);
                                setFiltroEpp(event.target.value);
                            }}
                            className="rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                        >
                            <option value="todos">EPP: todos</option>
                            <option value="si">Solo EPP</option>
                            <option value="no">No EPP</option>
                        </select>
                        {!loading ? (
                            <p className="text-xs text-app-mutedtext lg:ml-auto">
                                {total === 0 ? "0 artículos" : `${fromRow}–${toRow} de ${total}`}
                            </p>
                        ) : null}
                    </div>
                }
                empty={
                    loading
                        ? undefined
                        : rows.length === 0
                            ? (search.trim() || filtroFamilia || filtroGrupo || filtroEpp !== "todos"
                                ? "No hay artículos que coincidan con la búsqueda o los filtros."
                                : "Todavía no hay artículos.")
                            : undefined
                }
            >
                {loading ? (
                    <TableGhost
                        minWidth="72rem"
                        columns={[
                            { label: "Familia" },
                            { label: "Grupo" },
                            { label: "Código" },
                            { label: "Nombre" },
                            { label: "Unidad" },
                            { label: "Estado" },
                            { label: "EPP" },
                            { label: "Costo", align: "right" },
                            ...(showActions ? [{ label: "Acciones", align: "right" }] : []),
                        ]}
                    />
                ) : rows.length > 0 ? (
                    <table className="w-full min-w-[72rem] text-left text-sm">
                        <thead className="bg-app-muted text-app-mutedtext">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Familia</th>
                                <th className="px-4 py-3 font-semibold">Grupo</th>
                                <th className="px-4 py-3 font-semibold">
                                    <SortButton label="Código" active={sort.key === "codigo"} dir={sort.dir} onClick={() => toggleSort("codigo")} />
                                </th>
                                <th className="px-4 py-3 font-semibold">
                                    <SortButton label="Nombre" active={sort.key === "nombre"} dir={sort.dir} onClick={() => toggleSort("nombre")} />
                                </th>
                                <th className="px-4 py-3 font-semibold">Unidad</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                                <th className="px-4 py-3 font-semibold">EPP</th>
                                <th className="px-4 py-3 text-right font-semibold">
                                    <SortButton label="Costo" active={sort.key === "costo"} dir={sort.dir} align="right" onClick={() => toggleSort("costo")} />
                                </th>
                                {showActions ? <th className="px-4 py-3 text-right font-semibold">Acciones</th> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const editing = draft?.id === row.id;
                                return (
                                    <TableAppearRow key={`${row.id}-${index}`} index={index} className="border-t border-app-border-subtle align-middle">
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <SearchSelect
                                                    value={draft.id_familia ?? ""}
                                                    onChange={(id_familia) => setDraft({ ...draft, id_familia, id_grupo: "" })}
                                                    emptyOption="Sin familia"
                                                    placeholder="Buscar familia…"
                                                    className="min-w-[9rem]"
                                                    options={familias.map((f) => ({
                                                        value: f.id,
                                                        label: formatFamiliaGrupo(f.codigo, f.descripcion),
                                                    }))}
                                                />
                                            ) : row.familia_codigo ? (
                                                <span>{formatFamiliaGrupo(row.familia_codigo, row.familia_descripcion)}</span>
                                            ) : (
                                                <span className="text-app-faint">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <SearchSelect
                                                    value={draft.id_grupo ?? ""}
                                                    onChange={(id_grupo) => setDraft({ ...draft, id_grupo })}
                                                    disabled={!draft.id_familia}
                                                    emptyOption="Sin grupo"
                                                    placeholder="Buscar grupo…"
                                                    className="min-w-[9rem]"
                                                    options={grupos.filter((g) => g.id_familia === draft.id_familia).map((g) => ({
                                                        value: g.id,
                                                        label: formatFamiliaGrupo(g.codigo, g.descripcion),
                                                    }))}
                                                />
                                            ) : row.grupo_codigo ? (
                                                <span>{formatFamiliaGrupo(row.grupo_codigo, row.grupo_descripcion)}</span>
                                            ) : (
                                                <span className="text-app-faint">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <input
                                                    value={draft.codigo}
                                                    onChange={(event) => setDraft({ ...draft, codigo: event.target.value })}
                                                    maxLength={40}
                                                    className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                                                />
                                            ) : (
                                                <InternalCode>{row.codigo}</InternalCode>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <input
                                                    value={draft.nombre}
                                                    onChange={(event) => setDraft({ ...draft, nombre: event.target.value })}
                                                    maxLength={255}
                                                    className="w-full min-w-[10rem] rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                                                />
                                            ) : (
                                                <span className="font-medium text-app-primary">{row.nombre}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <input
                                                    value={draft.unidad_de_medida}
                                                    onChange={(event) => setDraft({ ...draft, unidad_de_medida: event.target.value })}
                                                    maxLength={40}
                                                    className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                                                />
                                            ) : (
                                                row.unidad_de_medida
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <EstadoSelect value={draft.estado} onChange={(estado) => setDraft({ ...draft, estado })} />
                                            ) : (
                                                <EstadoBadge estado={row.estado} />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editing ? (
                                                <label className="inline-flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={draft.is_epp}
                                                        onChange={(event) => setDraft({ ...draft, is_epp: event.target.checked })}
                                                    />
                                                    Es EPP
                                                </label>
                                            ) : row.is_epp ? (
                                                <Badge tone="info">EPP</Badge>
                                            ) : (
                                                <span className="text-app-faint">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {editing ? (
                                                draft.reemplazarCosto ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={draft.nuevoCosto}
                                                            onChange={(event) => setDraft({ ...draft, nuevoCosto: event.target.value })}
                                                            className="w-28 rounded-control border border-app-input px-2 py-1.5 text-right text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                                                            placeholder="Nuevo"
                                                        />
                                                        <Button
                                                            variant="table"
                                                            aria-label="Cancelar precio"
                                                            onClick={() => setDraft({ ...draft, reemplazarCosto: false, nuevoCosto: "" })}
                                                        >
                                                            <X size={16} strokeWidth={1.7} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span>{formatCurrency(row.costo_actual)}</span>
                                                        <Button
                                                            variant="table"
                                                            aria-label="Quitar precio"
                                                            onClick={() => setDraft({ ...draft, reemplazarCosto: true, nuevoCosto: "" })}
                                                        >
                                                            <X size={16} strokeWidth={1.7} />
                                                        </Button>
                                                    </div>
                                                )
                                            ) : (
                                                formatCurrency(row.costo_actual)
                                            )}
                                        </td>
                                        {showActions ? (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {editing ? (
                                                        <>
                                                            <Button variant="table" aria-label="Guardar" disabled={saving} onClick={() => void handleSaveEdit()}>
                                                                <Check size={18} strokeWidth={1.7} />
                                                            </Button>
                                                            <Button variant="table" aria-label="Cancelar" disabled={saving} onClick={() => setDraft(null)}>
                                                                <X size={18} strokeWidth={1.7} />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {canHistorial ? (
                                                                <Button
                                                                    variant="table"
                                                                    aria-label={`Historial de ${row.nombre}`}
                                                                    disabled={Boolean(draft)}
                                                                    onClick={() => navigate(SPA_PATHS.articuloHistorial(row.id))}
                                                                >
                                                                    <History size={18} strokeWidth={1.7} />
                                                                </Button>
                                                            ) : null}
                                                            {canWrite ? (
                                                                <>
                                                                    <Button
                                                                        variant="table"
                                                                        aria-label={`Editar ${row.nombre}`}
                                                                        disabled={Boolean(draft)}
                                                                        onClick={() => setDraft({
                                                                            id: row.id,
                                                                            codigo: row.codigo,
                                                                            nombre: row.nombre,
                                                                            unidad_de_medida: row.unidad_de_medida,
                                                                            estado: row.estado,
                                                                            is_epp: row.is_epp,
                                                                            id_familia: row.id_familia ?? "",
                                                                            id_grupo: row.id_grupo ?? "",
                                                                            reemplazarCosto: false,
                                                                            nuevoCosto: "",
                                                                        })}
                                                                    >
                                                                        <Pencil size={18} strokeWidth={1.7} />
                                                                    </Button>
                                                                    {row.tiene_movimientos ? (
                                                                        row.estado === "activo" ? (
                                                                            <Button
                                                                                variant="table"
                                                                                aria-label={`Desactivar ${row.nombre}`}
                                                                                disabled={Boolean(draft)}
                                                                                onClick={() => setToDelete(row)}
                                                                            >
                                                                                <Ban size={18} strokeWidth={1.7} />
                                                                            </Button>
                                                                        ) : null
                                                                    ) : (
                                                                        <Button
                                                                            variant="table"
                                                                            aria-label={`Eliminar ${row.nombre}`}
                                                                            disabled={Boolean(draft)}
                                                                            onClick={() => setToDelete(row)}
                                                                        >
                                                                            <Trash2 size={18} strokeWidth={1.7} />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        ) : null}
                                    </TableAppearRow>
                                );
                            })}
                        </tbody>
                    </table>
                ) : null}
            </TableShell>

            {total > 0 ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-app-mutedtext">
                        {fromRow}–{toRow} de {total}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" disabled={loading || page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                            <ChevronLeft size={16} strokeWidth={1.7} />
                            Anterior
                        </Button>
                        <span className={cn("min-w-[7rem] text-center text-sm text-app-secondarytext")}>
                            Página {page + 1} de {pageCount}
                        </span>
                        <Button variant="secondary" disabled={loading || page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>
                            Siguiente
                            <ChevronRight size={16} strokeWidth={1.7} />
                        </Button>
                    </div>
                </div>
            ) : null}

            <FormModal
                open={createOpen}
                title="Cargar artículo"
                description="El código se sugiere en correlativo de tres dígitos según los activos. Familia y grupo son opcionales."
                onClose={() => !saving && setCreateOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>Cancelar</Button>
                        <Button form="create-articulo" type="submit" disabled={saving || Boolean(createCodeOwner)}>
                            {saving ? <Spinner className="h-4 w-4 text-white" /> : null}
                            Guardar
                        </Button>
                    </>
                }
            >
                <form id="create-articulo" className="space-y-3" onSubmit={handleCreate}>
                    {createError ? <Alert>{createError}</Alert> : null}
                    {createCodeOwner ? (
                        <Alert>{mensajeArticuloCodigoOcupado(createCodeOwner, create.codigo)}</Alert>
                    ) : null}
                    <Input
                        label="Código"
                        value={create.codigo}
                        maxLength={40}
                        onChange={(event) => setCreate({ ...create, codigo: event.target.value })}
                        required
                        hint={<span className="text-xs text-app-mutedtext">Sugerido: {suggestedCode}. {hintCodigoUnico()}</span>}
                    />
                    <Input label="Nombre" value={create.nombre} maxLength={255} onChange={(event) => setCreate({ ...create, nombre: event.target.value })} required />
                    <Input label="Unidad" value={create.unidad_de_medida} maxLength={40} onChange={(event) => setCreate({ ...create, unidad_de_medida: event.target.value })} required />
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-app-secondarytext">Familia / grupo</p>
                        <FamiliaGrupoSelects
                            familias={familias}
                            grupos={grupos}
                            idFamilia={create.id_familia}
                            idGrupo={create.id_grupo}
                            onlyActivos
                            onFamilia={(id) => setCreate({ ...create, id_familia: id, id_grupo: "" })}
                            onGrupo={(id) => setCreate({ ...create, id_grupo: id })}
                        />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-app-primary">
                        <input type="checkbox" checked={create.is_epp} onChange={(event) => setCreate({ ...create, is_epp: event.target.checked })} />
                        Es EPP
                    </label>
                    <Input
                        label="Costo (opcional)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={create.costo}
                        onChange={(event) => setCreate({ ...create, costo: event.target.value })}
                    />
                </form>
            </FormModal>

            <FormModal
                open={uploadOpen}
                title="Carga masiva de artículos"
                description="Elegí cómo es el Excel (igual que al descargar) y después arrastralo. Así se lee solo esa planilla y el aviso dice qué se agregó, qué se editó y qué faltaba. No se eliminan artículos. IS_EPP: X = sí, vacío = no."
                onClose={() => !saving && setUploadOpen(false)}
                className="max-w-lg"
                footer={
                    <>
                        <Button variant="secondary" disabled={saving} onClick={() => setUploadOpen(false)}>Cancelar</Button>
                        <Button onClick={() => void handleUpload()} disabled={saving || !uploadFile}>
                            {saving ? <Spinner className="h-4 w-4 text-white" /> : null}
                            Cargar Excel
                        </Button>
                    </>
                }
            >
                {uploadError ? <Alert>{uploadError}</Alert> : null}
                <ExcelFormatoCampos
                    variant="upload"
                    mode={uploadMode}
                    onModeChange={(next) => {
                        setUploadMode(next);
                        setUploadError(null);
                        if (next === "deposito" && !depositosCarga.some((dep) => dep.id === uploadDeposito)) {
                            setUploadDeposito("");
                        }
                    }}
                    depositoId={uploadDeposito}
                    onDepositoChange={setUploadDeposito}
                    familiaId={uploadFamilia}
                    onFamiliaChange={setUploadFamilia}
                    grupoId={uploadGrupo}
                    onGrupoChange={setUploadGrupo}
                    depositos={depositosCarga}
                    familias={familias}
                    grupos={grupos}
                    emptyDepositoMessage="No hay depósitos para elegir. Podés cargar el Excel de todos los depósitos."
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(event) => takeFile(event.target.files?.[0])}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        takeFile(event.dataTransfer.files[0]);
                    }}
                    className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm ${
                        dragging ? "border-app-focus bg-app-subtle" : "border-app-input bg-app-muted"
                    }`}
                >
                    <Upload size={22} strokeWidth={1.6} className="mb-2 text-app-mutedtext" />
                    <span className="font-medium text-app-primary">Arrastrá el Excel o hacé clic para seleccionarlo</span>
                    <span className="mt-1 text-xs text-app-mutedtext">
                        {uploadMode === "familia"
                            ? (uploadFamilia
                                ? "La hoja debe llamarse con el código y la descripción de esa familia."
                                : "Hoja Familias y una planilla por código de familia.")
                            : uploadMode === "deposito"
                                ? (uploadDeposito
                                    ? "La hoja debe llamarse con el código y el nombre de ese depósito. La cantidad no se carga."
                                    : "Hoja Depósitos y una planilla por depósito. La cantidad no se carga: solo el catálogo.")
                                : "Una sola hoja Artículos (FAMILIA, GRUPO, COD_ARTIC, DESCRIP, UNIDADMED, IS_EPP)."}
                    </span>
                    {uploadFile ? (
                        <span className="mt-3 rounded-pill bg-app-surface px-3 py-1 text-xs font-medium text-app-secondarytext">{uploadFile.name}</span>
                    ) : null}
                </button>
            </FormModal>

            <FormModal
                open={downloadOpen}
                title="Descargar archivos"
                description="Todos los artículos va en una sola hoja. Por familia o por depósito: si elegís todas, hay una hoja principal y una por cada una; si elegís una sola, la planilla lleva su código y nombre."
                onClose={() => setDownloadOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDownloadOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => void handleDownload()}
                            disabled={downloading || (downloadMode === "deposito" && !depositosConArchivos.length)}
                        >
                            {downloading ? <Spinner className="h-4 w-4 text-white" /> : null}
                            {downloading ? "Descargando…" : "Descargar"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <ExcelFormatoCampos
                        variant="download"
                        mode={downloadMode}
                        onModeChange={(next) => {
                            setDownloadMode(next);
                            if (next === "deposito" && !depositosConArchivos.some((dep) => dep.id === downloadDeposito)) {
                                setDownloadDeposito("");
                            }
                        }}
                        depositoId={downloadDeposito}
                        onDepositoChange={setDownloadDeposito}
                        familiaId={downloadFamilia}
                        onFamiliaChange={setDownloadFamilia}
                        grupoId={downloadGrupo}
                        onGrupoChange={setDownloadGrupo}
                        depositos={depositosConArchivos}
                        familias={familias}
                        grupos={grupos}
                    />
                    {perfil?.esResponsableDeposito ? (
                        <p className="text-xs text-app-mutedtext">Solo se incluye lo de tus depósitos.</p>
                    ) : null}
                </div>
            </FormModal>

            <ConfirmDialog
                open={Boolean(toDelete)}
                title={deleteTieneMovimientos ? "No se puede eliminar" : "Eliminar artículo"}
                description={deleteDescription}
                confirmLabel={deleteTieneMovimientos ? "Desactivar" : "Eliminar"}
                cancelLabel={deleteTieneMovimientos && deleteYaInactivo ? "Entendido" : "Cancelar"}
                confirmVariant={deleteTieneMovimientos ? "primary" : "danger"}
                showConfirm={!deleteChecking && !(deleteTieneMovimientos && deleteYaInactivo)}
                pending={saving || deleteChecking}
                lockClose={saving}
                onConfirm={() => void handleDelete()}
                onClose={() => !saving && setToDelete(null)}
            />
        </section>
    );
}
