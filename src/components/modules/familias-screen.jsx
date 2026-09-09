import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, ChevronsUpDown, Download, FolderKanban, Pencil, Plus, Search, Trash2, Upload, X, } from "lucide-react";
import { ConfirmDialog } from "@/components/modals/confirm-dialog";
import { FormModal } from "@/components/modals/form-modal";
import { Alert } from "@/components/ui/alert";
import { EstadoBadge, EstadoSelect, InternalCode } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import { createFamilia, eliminarFamilia, explainFamiliaError, findFamiliaPorCodigo, listFamiliasCodigos, listFamiliasConGrupos, listFamiliasResumen, nextCodigoDesdeActivos, updateFamilia, upsertGrupos, } from "@/services/familias";
import { hintCodigoUnico, mensajeFamiliaCodigoOcupado } from "@/utils/codigo-unico";
import { downloadFamiliasExcel, parseFamiliasExcel } from "@/utils/excel-familias";
import { formatCurrency } from "@/utils/format";
import { SPA_PATHS } from "@/utils/routes";
function SortButton({ label, active, dir, align = "left", onClick, }) {
    const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
    return (<button type="button" onClick={onClick} className={`inline-flex items-center gap-1 font-semibold ${align === "right" ? "w-full justify-end" : ""}`}>
      {label}
      <Icon size={14} strokeWidth={1.8} className="text-app-faint"/>
    </button>);
}
export function FamiliasScreen() {
    const navigate = useNavigate();
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [codigos, setCodigos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState({ key: "codigo", dir: "asc" });
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createCode, setCreateCode] = useState("");
    const [createName, setCreateName] = useState("");
    const [createError, setCreateError] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [excelMode, setExcelMode] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);
    const isAdmin = Boolean(perfil?.esAdministrador);
    const canView = isAdmin || Boolean(perfil?.esVistaDescarga);
    const canWrite = isAdmin;
    async function reload() {
        const [resumen, allCodes] = await Promise.all([
            listFamiliasResumen(),
            listFamiliasCodigos(),
        ]);
        setRows(resumen);
        setCodigos(allCodes);
    }
    useEffect(() => {
        if (perfilLoading)
            return;
        if (!canView) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        reload()
            .catch((error) => {
            notify(explainFamiliaError(error), "error");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [canView, perfilLoading, notify]);
    const suggestedCode = useMemo(() => nextCodigoDesdeActivos(codigos), [codigos]);
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = term
            ? rows.filter((row) => row.codigo.toLowerCase().includes(term) ||
                row.descripcion.toLowerCase().includes(term))
            : rows;
        const factor = sort.dir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            if (sort.key === "codigo" || sort.key === "descripcion" || sort.key === "estado") {
                return a[sort.key].localeCompare(b[sort.key], "es", { numeric: true }) * factor;
            }
            const left = Number(a[sort.key] ?? 0);
            const right = Number(b[sort.key] ?? 0);
            return (left - right) * factor;
        });
    }, [rows, search, sort]);
    function familiaConCodigo(codigo, ignoreId) {
        const key = codigo.trim().toLowerCase();
        if (!key)
            return null;
        return (codigos.find((row) => row.codigo.toLowerCase() === key && row.id !== ignoreId) ?? null);
    }
    const createCodeOwner = familiaConCodigo(createCode);
    const draftCodeOwner = draft
        ? familiaConCodigo(draft.codigo, draft.id)
        : null;
    function toggleSort(key) {
        setSort((current) => {
            if (current.key === key) {
                return { key, dir: current.dir === "asc" ? "desc" : "asc" };
            }
            const numeric = key === "cant_grupos" || key === "cant_articulos" || key === "costo_total";
            return { key, dir: numeric ? "desc" : "asc" };
        });
    }
    function openCreate() {
        setCreateError(null);
        setCreateCode(nextCodigoDesdeActivos(codigos));
        setCreateName("");
        setCreateOpen(true);
    }
    function openExcel(mode) {
        setExcelMode(mode);
        setUploadError(null);
        setUploadFile(null);
        setSelectedIds(new Set(rows.map((row) => row.id)));
    }
    function toggleSelected(id) {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }
    async function handleCreate(event) {
        event.preventDefault();
        setCreateError(null);
        if (!createCode.trim() || !createName.trim()) {
            setCreateError("Completá código y descripción.");
            return;
        }
        const owner = createCodeOwner ?? await findFamiliaPorCodigo(createCode);
        if (owner) {
            setCreateError(mensajeFamiliaCodigoOcupado(owner, createCode));
            return;
        }
        setSaving(true);
        try {
            await createFamilia({ codigo: createCode, descripcion: createName });
            await reload();
            setCreateOpen(false);
            notify("Familia cargada.", "success");
        }
        catch (error) {
            const err = error;
            setCreateError(explainFamiliaError(err));
        }
        finally {
            setSaving(false);
        }
    }
    async function handleSaveEdit() {
        if (!draft)
            return;
        if (!draft.codigo.trim() || !draft.descripcion.trim()) {
            notify("Completá código y descripción.", "error");
            return;
        }
        const owner = draftCodeOwner ?? await findFamiliaPorCodigo(draft.codigo, draft.id);
        if (owner) {
            notify(mensajeFamiliaCodigoOcupado(owner, draft.codigo), "error");
            return;
        }
        setSaving(true);
        try {
            await updateFamilia(draft.id, {
                codigo: draft.codigo,
                descripcion: draft.descripcion,
                estado: draft.estado,
            });
            await reload();
            setDraft(null);
            notify("Familia actualizada.", "success");
        }
        catch (error) {
            const err = error;
            notify(explainFamiliaError(err), "error");
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDelete() {
        if (!toDelete)
            return;
        setSaving(true);
        try {
            await eliminarFamilia(toDelete.id);
            await reload();
            if (draft?.id === toDelete.id)
                setDraft(null);
            setToDelete(null);
            notify("Familia eliminada. Sus grupos también se borraron. Los artículos quedaron sin grupo.", "success");
        }
        catch (error) {
            const err = error;
            notify(explainFamiliaError(err), "error");
        }
        finally {
            setSaving(false);
        }
    }
    async function handleReactivar(row) {
        setSaving(true);
        setCreateError(null);
        try {
            await updateFamilia(row.id, {
                codigo: row.codigo,
                descripcion: row.descripcion,
                estado: "activo",
            });
            await reload();
            setCreateOpen(false);
            notify(`Se reactivó la familia “${row.descripcion}”.`, "success");
        }
        catch (error) {
            const err = error;
            setCreateError(explainFamiliaError(err));
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDownload() {
        if (rows.length > 0 && selectedIds.size === 0) {
            setUploadError("Seleccioná al menos una familia.");
            return;
        }
        setSaving(true);
        setUploadError(null);
        try {
            const ids = [...selectedIds];
            const data = await listFamiliasConGrupos(ids);
            downloadFamiliasExcel(data);
            notify(data.length === 0
                ? "Se descargó la plantilla de Excel."
                : "Excel descargado.", "success");
            setExcelMode(null);
        }
        catch (error) {
            const err = error;
            setUploadError(explainFamiliaError(err));
        }
        finally {
            setSaving(false);
        }
    }
    function takeFile(file) {
        if (!file)
            return;
        const name = file.name.toLowerCase();
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            setUploadError("Usá un archivo Excel (.xlsx).");
            setUploadFile(null);
            return;
        }
        setUploadError(null);
        setUploadFile(file);
    }
    async function handleUpload() {
        if (selectedIds.size === 0) {
            setUploadError("Seleccioná al menos una familia.");
            return;
        }
        if (!uploadFile) {
            setUploadError("Seleccioná o arrastrá un Excel.");
            return;
        }
        setSaving(true);
        setUploadError(null);
        try {
            const buffer = await uploadFile.arrayBuffer();
            const parsed = parseFamiliasExcel(buffer);
            const selected = rows.filter((row) => selectedIds.has(row.id));
            const selectedCodes = new Map(selected.map((row) => [row.codigo.toLowerCase(), row.id]));
            const unknown = parsed.filter((row) => !codigos.some((familia) => familia.codigo.toLowerCase() === row.familia_codigo.toLowerCase()));
            if (unknown.length > 0) {
                throw new Error(`La familia “${unknown[0].familia_codigo}” no existe. Las familias se cargan de a una, no por Excel.`);
            }
            const inactive = parsed.find((row) => {
                const familia = codigos.find((item) => item.codigo.toLowerCase() === row.familia_codigo.toLowerCase());
                return familia?.estado === "inactivo";
            });
            if (inactive) {
                throw new Error(`La familia “${inactive.familia_codigo}” está inactiva. No se pueden cargar grupos ahí.`);
            }
            const grupos = parsed
                .map((row) => {
                const id_familia = selectedCodes.get(row.familia_codigo.toLowerCase());
                if (!id_familia)
                    return null;
                return {
                    id_familia,
                    codigo: row.codigo,
                    descripcion: row.descripcion,
                };
            })
                .filter((row) => Boolean(row));
            if (grupos.length === 0) {
                throw new Error("El Excel no tiene grupos para las familias seleccionadas.");
            }
            const result = await upsertGrupos(grupos);
            setExcelMode(null);
            setUploadFile(null);
            setLoading(true);
            await reload();
            const parts = [];
            if (result.created > 0) {
                parts.push(`${result.created} grupo${result.created === 1 ? "" : "s"} nuevo${result.created === 1 ? "" : "s"}`);
            }
            if (result.updated > 0) {
                parts.push(`${result.updated} actualizado${result.updated === 1 ? "" : "s"}`);
            }
            notify(parts.length === 0
                ? "Carga masiva lista: ningún grupo cambió."
                : `Carga masiva lista: ${parts.join(" y ")}.`, "success");
        }
        catch (error) {
            const err = error;
            setUploadError(explainFamiliaError(err));
        }
        finally {
            setSaving(false);
            setLoading(false);
        }
    }
    if (perfilLoading) {
        return (<div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>);
    }
    if (!canView) {
        return (<section>
        <PageHeader title="Familias / Grupos" description="La gestión de familias y grupos está reservada al rol Administrador."/>
        <Alert>Tu usuario no puede ver familias.</Alert>
      </section>);
    }
    const allSelected = rows.length > 0 && selectedIds.size === rows.length;
    return (<section>
      <PageHeader title="Familias / Grupos" description={canWrite
            ? "Alta y edición de familias. La cantidad de grupos, artículos y el costo se calculan solos."
            : "Solo lectura y descarga. La cantidad de grupos, artículos y el costo se calculan solos."} actions={<>
            <Button variant="secondary" className="w-full lg:w-auto" onClick={() => openExcel("download")} disabled={loading}>
              <Download size={18} strokeWidth={1.6}/>
              Descargar
            </Button>
            {canWrite ? (<>
                <Button variant="secondary" className="w-full lg:w-auto" onClick={() => openExcel("upload")} disabled={loading || rows.length === 0}>
                  <Upload size={18} strokeWidth={1.6}/>
                  Cargar
                </Button>
                <Button className="w-full lg:w-auto" onClick={openCreate}>
                  <Plus size={18} strokeWidth={1.6}/>
                  Cargar nueva familia
                </Button>
              </>) : null}
          </>}/>

      <TableShell toolbar={<label className="relative block max-w-md">
            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código o nombre" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
          </label>} empty={loading
            ? undefined
            : filtered.length === 0
                ? search.trim()
                    ? "No hay familias que coincidan con la búsqueda."
                    : "Todavía no hay familias."
                : undefined}>
        {loading ? (<TableGhost minWidth="56rem" columns={[
                { label: "Código" },
                { label: "Nombre" },
                { label: "Estado" },
                { label: "Cant. grupos", align: "right" },
                { label: "Cant. artículos", align: "right" },
                { label: "Costo total", align: "right" },
                { label: "Acciones", align: "right" },
            ]}/>) : filtered.length > 0 ? (<table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-app-muted text-app-mutedtext">
              <tr>
                <th className="px-4 py-3">
                  <SortButton label="Código" active={sort.key === "codigo"} dir={sort.dir} onClick={() => toggleSort("codigo")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Nombre" active={sort.key === "descripcion"} dir={sort.dir} onClick={() => toggleSort("descripcion")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Estado" active={sort.key === "estado"} dir={sort.dir} onClick={() => toggleSort("estado")}/>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton label="Cant. grupos" active={sort.key === "cant_grupos"} dir={sort.dir} align="right" onClick={() => toggleSort("cant_grupos")}/>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton label="Cant. artículos" active={sort.key === "cant_articulos"} dir={sort.dir} align="right" onClick={() => toggleSort("cant_articulos")}/>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton label="Costo total" active={sort.key === "costo_total"} dir={sort.dir} align="right" onClick={() => toggleSort("costo_total")}/>
                </th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const editing = draft?.id === row.id;
                return (<TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                    <td className="px-4 py-3">
                      {editing ? (<input value={draft.codigo} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} maxLength={10} className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (<InternalCode>{row.codigo}</InternalCode>)}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (<input value={draft.descripcion} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} maxLength={255} className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (<span className="font-medium text-app-primary">
                          {row.descripcion}
                        </span>)}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (<EstadoSelect value={draft.estado} onChange={(estado) => setDraft({ ...draft, estado })}/>) : (<EstadoBadge estado={row.estado}/>)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(row.cant_grupos ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(row.cant_articulos ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(Number(row.costo_total ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {editing ? (<>
                            <Button variant="table" aria-label="Guardar" disabled={saving} onClick={() => void handleSaveEdit()}>
                              <Check size={18} strokeWidth={1.7}/>
                            </Button>
                            <Button variant="table" aria-label="Cancelar" disabled={saving} onClick={() => setDraft(null)}>
                              <X size={18} strokeWidth={1.7}/>
                            </Button>
                          </>) : (<>
                            {canWrite ? (<>
                                <Button variant="table" aria-label={`Editar ${row.descripcion}`} disabled={Boolean(draft)} onClick={() => setDraft({
                            id: row.id,
                            codigo: row.codigo,
                            descripcion: row.descripcion,
                            estado: row.estado,
                        })}>
                                  <Pencil size={18} strokeWidth={1.7}/>
                                </Button>
                                <Button variant="table" aria-label={`Eliminar ${row.descripcion}`} disabled={Boolean(draft)} onClick={() => setToDelete(row)}>
                                  <Trash2 size={18} strokeWidth={1.7}/>
                                </Button>
                              </>) : null}
                            <Button variant="table" className="px-2" aria-label={`${canWrite ? "Gestionar" : "Ver"} grupos y artículos de ${row.descripcion}`} disabled={Boolean(draft)} onClick={() => navigate(SPA_PATHS.familiaDetalle(row.id))}>
                              <FolderKanban size={18} strokeWidth={1.7}/>
                              <span className="text-xs font-medium">{canWrite ? "Gestionar" : "Ver grupos"}</span>
                            </Button>
                          </>)}
                      </div>
                    </td>
                  </TableAppearRow>);
            })}
            </tbody>
          </table>) : null}
      </TableShell>

      <FormModal open={createOpen} title="Cargar nueva familia" description="El código se sugiere en correlativo de tres dígitos. Podés cambiarlo." onClose={() => !saving && setCreateOpen(false)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button form="create-familia" type="submit" disabled={saving || Boolean(createCodeOwner)}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Guardar
            </Button>
          </>}>
        <form id="create-familia" className="space-y-3" onSubmit={handleCreate}>
          {createError ? <Alert>{createError}</Alert> : null}
          {createCodeOwner?.estado === "inactivo" ? (<div className="rounded-control border border-app-input bg-app-subtle px-3 py-3 text-sm text-app-secondarytext">
              <p>
                {mensajeFamiliaCodigoOcupado(createCodeOwner, createCode)} Reactivala o eliminala, o usá otro código.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" disabled={saving} onClick={() => void handleReactivar(createCodeOwner)}>
                  Reactivar
                </Button>
                <Button type="button" variant="danger" disabled={saving} onClick={() => setToDelete(createCodeOwner)}>
                  Eliminar
                </Button>
              </div>
            </div>) : createCodeOwner ? (<Alert>
              {mensajeFamiliaCodigoOcupado(createCodeOwner, createCode)}
            </Alert>) : null}
          <Input label="Código" value={createCode} maxLength={10} onChange={(event) => setCreateCode(event.target.value)} required hint={<span className="text-xs text-app-mutedtext">
                Sugerido: {suggestedCode}. {hintCodigoUnico()}
              </span>}/>
          <Input label="Descripción" value={createName} maxLength={255} onChange={(event) => setCreateName(event.target.value)} required/>
        </form>
      </FormModal>

      <FormModal open={Boolean(excelMode)} title={excelMode === "upload" ? "Cargar grupos" : "Descargar familias"} description={excelMode === "upload"
            ? "Seleccioná las familias y usá el mismo Excel de la descarga. Solo se agregan o actualizan grupos; no se crean familias."
            : "Seleccioná si querés descargar todas o solo algunas familias, con sus grupos."} className="max-w-lg" onClose={() => !saving && setExcelMode(null)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setExcelMode(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void (excelMode === "upload" ? handleUpload() : handleDownload())} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              {excelMode === "upload" ? "Cargar Excel" : "Descargar"}
            </Button>
          </>}>
        {uploadError ? <Alert>{uploadError}</Alert> : null}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-app-secondarytext">Familias</p>
          <button type="button" className="text-xs font-medium text-app-mutedtext underline" onClick={() => setSelectedIds(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}>
            {allSelected ? "Quitar todas" : "Seleccionar todas"}
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-xl border border-app-border-subtle">
          {rows.length === 0 ? (<p className="px-3 py-4 text-sm text-app-mutedtext">
              No hay familias. Se descargará la plantilla vacía.
            </p>) : (rows.map((row) => (<label key={row.id} className="flex cursor-pointer items-center gap-3 border-b border-app-border-subtle px-3 py-2 text-sm last:border-b-0 hover:bg-app-subtle">
                <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} className="h-4 w-4 accent-app-accent"/>
                <InternalCode>{row.codigo}</InternalCode>
                <span className="truncate font-medium text-app-primary">
                  {row.descripcion}
                </span>
                <EstadoBadge estado={row.estado}/>
              </label>)))}
        </div>
        {excelMode === "upload" ? (<>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => takeFile(event.target.files?.[0])}/>
            <button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
            }} onDragLeave={() => setDragging(false)} onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                takeFile(event.dataTransfer.files[0]);
            }} className={`flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm ${dragging
                ? "border-app-focus bg-app-subtle"
                : "border-app-input bg-app-muted"}`}>
              <Upload size={22} strokeWidth={1.6} className="mb-2 text-app-mutedtext"/>
              <span className="font-medium text-app-primary">
                Arrastrá el Excel o hacé clic para seleccionarlo
              </span>
              <span className="mt-1 text-xs text-app-mutedtext">
                Misma estructura de la descarga: hoja Familias y una hoja por familia
              </span>
              {uploadFile ? (<span className="mt-3 rounded-pill bg-app-surface px-3 py-1 text-xs font-medium text-app-secondarytext">
                  {uploadFile.name}
                </span>) : null}
            </button>
          </>) : null}
      </FormModal>

      <ConfirmDialog open={Boolean(toDelete)} title="Eliminar familia" description={toDelete
            ? `Si eliminás “${toDelete.descripcion}”, se borra de forma permanente junto con todos sus grupos. No hay vuelta atrás. Los artículos de esos grupos quedan sin grupo; no se borran.`
            : ""} pending={saving} onConfirm={() => void handleDelete()} onClose={() => !saving && setToDelete(null)}/>
    </section>);
}
