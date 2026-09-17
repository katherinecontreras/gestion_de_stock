import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Download, History, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
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
    eliminarArticulo,
    explainArticuloError,
    findArticuloPorCodigo,
    listArticulosExport,
    listArticulosPagina,
    listArticulosPorDeposito,
    listDepositosOpciones,
    listFamiliasOpciones,
    listGruposOpciones,
    nextArticuloCodigoSugerido,
    updateArticulo,
    upsertArticulos,
} from "@/services/articulos";
import { listDepositosPropios } from "@/services/depositos";
import { downloadArticulosExcel, parseArticulosExcel } from "@/utils/excel-articulos";
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
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [downloadOpen, setDownloadOpen] = useState(false);
    const [downloadMode, setDownloadMode] = useState("todos");
    const [downloadDeposito, setDownloadDeposito] = useState("");
    const [downloadFamilia, setDownloadFamilia] = useState("");
    const [downloadGrupo, setDownloadGrupo] = useState("");
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

    async function handleDelete() {
        if (!toDelete) return;
        setSaving(true);
        try {
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
            const filas = parseArticulosExcel(buffer);
            const result = await upsertArticulos(filas);
            await reloadPagina(0);
            setPage(0);
            setUploadOpen(false);
            const parts = [];
            if (result.created) parts.push(`${result.created} creados`);
            if (result.updated) parts.push(`${result.updated} editados`);
            notify(
                result.created + result.updated === 0
                    ? "Carga masiva lista: ningún artículo cambió."
                    : `Carga masiva lista: ${parts.join(" y ")}.`,
                "success",
            );
        } catch (error) {
            setUploadError(explainArticuloError(error));
        } finally {
            setSaving(false);
        }
    }

    async function handleDownload() {
        try {
            if (downloadMode === "deposito") {
                if (!downloadDeposito) {
                    notify("Elegí un depósito.", "error");
                    return;
                }
                const dep = depositos.find((d) => d.id === downloadDeposito);
                const data = await listArticulosPorDeposito(downloadDeposito);
                downloadArticulosExcel(data, `articulos-${dep?.codigo ?? "deposito"}.xlsx`, ["CANTIDAD"]);
            } else if (downloadMode === "familia") {
                const data = await listArticulosExport({
                    idFamilia: downloadFamilia,
                    idGrupo: downloadGrupo,
                    soloMisDepositos,
                });
                downloadArticulosExcel(data, "articulos-familia-grupo.xlsx");
            } else {
                downloadArticulosExcel(await listArticulosExport({ soloMisDepositos }));
            }
            setDownloadOpen(false);
            notify("Excel descargado.", "success");
        } catch (error) {
            notify(explainArticuloError(error), "error");
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
                                    <TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
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
                                                                    <Button
                                                                        variant="table"
                                                                        aria-label={`Eliminar ${row.nombre}`}
                                                                        disabled={Boolean(draft)}
                                                                        onClick={() => setToDelete(row)}
                                                                    >
                                                                        <Trash2 size={18} strokeWidth={1.7} />
                                                                    </Button>
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
                description="Usá el mismo Excel de la descarga. Un artículo nuevo entra activo. Si ya existe, no se toca el estado ni el costo. IS_EPP: X = sí, vacío = no."
                onClose={() => !saving && setUploadOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" disabled={saving} onClick={() => setUploadOpen(false)}>Cancelar</Button>
                        <Button onClick={() => void handleUpload()} disabled={saving}>
                            {saving ? <Spinner className="h-4 w-4 text-white" /> : null}
                            Cargar Excel
                        </Button>
                    </>
                }
            >
                {uploadError ? <Alert>{uploadError}</Alert> : null}
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
                    <span className="mt-1 text-xs text-app-mutedtext">FAMILIA, NOM_FAM, GRUPO, NOM_GRU, COD_ARTIC, DESCRIP, UNIDADMED, IS_EPP</span>
                    {uploadFile ? (
                        <span className="mt-3 rounded-pill bg-app-surface px-3 py-1 text-xs font-medium text-app-secondarytext">{uploadFile.name}</span>
                    ) : null}
                </button>
            </FormModal>

            <FormModal
                open={downloadOpen}
                title="Descargar archivos"
                description="Todos, por depósito o por familia/grupo. El Excel sirve después para la carga masiva."
                onClose={() => setDownloadOpen(false)}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDownloadOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => void handleDownload()}
                            disabled={downloadMode === "deposito" && (!downloadDeposito || !depositosConArchivos.length)}
                        >
                            Descargar
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <select
                        value={downloadMode}
                        onChange={(event) => {
                            const next = event.target.value;
                            setDownloadMode(next);
                            if (next === "deposito" && !depositosConArchivos.some((dep) => dep.id === downloadDeposito)) {
                                setDownloadDeposito("");
                            }
                        }}
                        className="w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                    >
                        <option value="todos">Todos los artículos</option>
                        <option value="deposito">Por depósito</option>
                        <option value="familia">Por familia / grupo</option>
                    </select>
                    {perfil?.esResponsableDeposito ? (
                        <p className="text-xs text-app-mutedtext">Solo se incluye lo de tus depósitos.</p>
                    ) : null}
                    {downloadMode === "deposito" ? (
                        depositosConArchivos.length ? (
                            <SearchSelect
                                value={downloadDeposito}
                                onChange={setDownloadDeposito}
                                emptyOption="Elegí un depósito"
                                placeholder="Buscar depósito…"
                                options={depositosConArchivos.map((d) => ({
                                    value: d.id,
                                    label: `${d.codigo} – ${d.nombre}`,
                                }))}
                            />
                        ) : (
                            <p className="text-sm text-app-mutedtext">No hay depósitos con artículos para descargar.</p>
                        )
                    ) : null}
                    {downloadMode === "familia" ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <SearchSelect
                                value={downloadFamilia}
                                onChange={(next) => {
                                    setDownloadFamilia(next);
                                    setDownloadGrupo("");
                                }}
                                emptyOption="Todas las familias"
                                placeholder="Buscar familia…"
                                options={familias.map((f) => ({
                                    value: f.id,
                                    label: formatFamiliaGrupo(f.codigo, f.descripcion),
                                }))}
                            />
                            <SearchSelect
                                value={downloadGrupo}
                                onChange={setDownloadGrupo}
                                disabled={!downloadFamilia}
                                emptyOption="Todos los grupos"
                                placeholder="Buscar grupo…"
                                options={grupos.filter((g) => g.id_familia === downloadFamilia).map((g) => ({
                                    value: g.id,
                                    label: formatFamiliaGrupo(g.codigo, g.descripcion),
                                }))}
                            />
                        </div>
                    ) : null}
                </div>
            </FormModal>

            <ConfirmDialog
                open={Boolean(toDelete)}
                title="Eliminar artículo"
                description={
                    toDelete
                        ? `Si confirmás, se elimina “${toDelete.codigo} – ${toDelete.nombre}”. Si tiene movimientos, no se puede borrar: cambialo a inactivo.`
                        : ""
                }
                pending={saving}
                onConfirm={() => void handleDelete()}
                onClose={() => !saving && setToDelete(null)}
            />
        </section>
    );
}
