import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, ChevronUp, ChevronsUpDown, Package, Pencil, Plus, Search, Trash2, X, } from "lucide-react";
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
import { asignarArticulosGrupo, codigoGrupoCompleto, createGrupo, eliminarGrupo, explainGrupoError, getFamiliaDetalle, listArticulosAsignacion, listGrupoCodigos, listGruposResumen, prefijoCodigoGrupo, updateGrupo, } from "@/services/grupos";
import { formatCurrency, formatFamiliaGrupo } from "@/utils/format";
import { SPA_PATHS } from "@/utils/routes";
function SortButton({ label, active, dir, align = "left", onClick, }) {
    const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
    return (<button type="button" onClick={onClick} className={`inline-flex items-center gap-1 font-semibold ${align === "right" ? "w-full justify-end" : ""}`}>
      {label}
      <Icon size={14} strokeWidth={1.8} className="text-app-faint"/>
    </button>);
}
function scoreArticulo(row, term) {
    const needle = term.toLowerCase();
    const codigo = row.codigo.toLowerCase();
    const nombre = row.nombre.toLowerCase();
    const familia = (row.familiaCodigo ?? "").toLowerCase();
    const grupo = (row.grupoCodigo ?? "").toLowerCase();
    if (codigo === needle)
        return 0;
    if (codigo.startsWith(needle) || nombre.startsWith(needle))
        return 1;
    if (codigo.includes(needle) || nombre.includes(needle))
        return 2;
    if (familia.includes(needle) || grupo.includes(needle))
        return 3;
    return 99;
}
export function FamiliaDetalleScreen() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [familia, setFamilia] = useState(null);
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
    const [gestionar, setGestionar] = useState(null);
    const [articulos, setArticulos] = useState([]);
    const [articulosLoading, setArticulosLoading] = useState(false);
    const [selectedArticulos, setSelectedArticulos] = useState(new Set());
    const [articuloSearch, setArticuloSearch] = useState("");
    const isAdmin = Boolean(perfil?.esAdministrador);
    async function reload() {
        if (!id)
            return;
        const [detalle, grupos, allCodes] = await Promise.all([
            getFamiliaDetalle(id),
            listGruposResumen(id),
            listGrupoCodigos(id),
        ]);
        setFamilia(detalle);
        setRows(grupos);
        setCodigos(allCodes);
    }
    useEffect(() => {
        if (perfilLoading)
            return;
        if (!isAdmin || !id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        void reload()
            .catch((error) => {
            if (!cancelled)
                notify(explainGrupoError(error), "error");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [id, isAdmin, perfilLoading, notify]);
    const familiaCodigo = familia?.codigo ?? "";
    const codigoPrefijo = prefijoCodigoGrupo(familiaCodigo);
    const createCodigoCompleto = codigoGrupoCompleto(codigoPrefijo, createCode);
    const createCodeOwner = useMemo(() => {
        const code = createCodigoCompleto.trim().toLowerCase();
        if (!codigoPrefijo || !createCode.trim())
            return null;
        return codigos.find((row) => row.codigo.toLowerCase() === code) ?? null;
    }, [createCodigoCompleto, createCode, codigoPrefijo, codigos]);
    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = term
            ? rows.filter((row) => row.codigo.toLowerCase().includes(term) ||
                row.descripcion.toLowerCase().includes(term))
            : rows;
        const dir = sort.dir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            if (sort.key === "codigo" || sort.key === "descripcion" || sort.key === "estado") {
                return a[sort.key].localeCompare(b[sort.key], "es", { numeric: true }) * dir;
            }
            const left = Number(a[sort.key] ?? 0);
            const right = Number(b[sort.key] ?? 0);
            return (left - right) * dir;
        });
    }, [rows, search, sort]);
    const articulosVisibles = useMemo(() => {
        const term = articuloSearch.trim();
        if (!term) {
            return [...articulos].sort((a, b) => {
                const aSel = selectedArticulos.has(a.id) ? 0 : 1;
                const bSel = selectedArticulos.has(b.id) ? 0 : 1;
                if (aSel !== bSel)
                    return aSel - bSel;
                return a.codigo.localeCompare(b.codigo, "es");
            });
        }
        return [...articulos]
            .map((row) => ({ row, score: scoreArticulo(row, term) }))
            .filter((item) => item.score < 99)
            .sort((a, b) => a.score - b.score || a.row.codigo.localeCompare(b.row.codigo, "es"))
            .map((item) => item.row);
    }, [articulos, articuloSearch, selectedArticulos]);
    function toggleSort(key) {
        setSort((current) => current.key === key
            ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
            : { key, dir: key === "codigo" ? "asc" : "desc" });
    }
    function openCreate() {
        setCreateCode("");
        setCreateName("");
        setCreateError(null);
        setCreateOpen(true);
    }
    async function handleCreate(event) {
        event.preventDefault();
        if (!id || !createCode.trim() || !createName.trim())
            return;
        if (createCodeOwner)
            return;
        setSaving(true);
        setCreateError(null);
        try {
            await createGrupo(id, { codigo: createCodigoCompleto, descripcion: createName });
            setCreateOpen(false);
            await reload();
            notify("Grupo creado.", "success");
        }
        catch (error) {
            const err = error;
            setCreateError(explainGrupoError(err));
        }
        finally {
            setSaving(false);
        }
    }
    async function handleSaveDraft() {
        if (!draft)
            return;
        if (!draft.codigo.trim() || !draft.descripcion.trim()) {
            notify("Completá código y descripción.", "error");
            return;
        }
        const owner = codigos.find((row) => row.id !== draft.id &&
            row.codigo.toLowerCase() === draft.codigo.trim().toLowerCase());
        if (owner) {
            notify(`El código “${draft.codigo.trim()}” pertenece al grupo “${owner.descripcion}”.`, "error");
            return;
        }
        setSaving(true);
        try {
            await updateGrupo(draft.id, draft);
            setDraft(null);
            await reload();
            notify("Grupo actualizado.", "success");
        }
        catch (error) {
            const err = error;
            notify(explainGrupoError(err), "error");
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
            await eliminarGrupo(toDelete.id);
            setToDelete(null);
            await reload();
            notify("Grupo eliminado. Los artículos quedaron sin grupo asignado.", "success");
        }
        catch (error) {
            const err = error;
            notify(explainGrupoError(err), "error");
        }
        finally {
            setSaving(false);
        }
    }
    async function handleReactivar(row) {
        setSaving(true);
        setCreateError(null);
        try {
            await updateGrupo(row.id, {
                codigo: row.codigo,
                descripcion: row.descripcion,
                estado: "activo",
            });
            await reload();
            setCreateOpen(false);
            notify(`Se reactivó el grupo “${row.descripcion}”.`, "success");
        }
        catch (error) {
            const err = error;
            setCreateError(explainGrupoError(err));
        }
        finally {
            setSaving(false);
        }
    }
    async function openGestionar(grupo) {
        setGestionar(grupo);
        setArticuloSearch("");
        setArticulosLoading(true);
        try {
            const list = await listArticulosAsignacion();
            setArticulos(list);
            setSelectedArticulos(new Set(list.filter((row) => row.idGrupo === grupo.id).map((row) => row.id)));
        }
        catch (error) {
            const err = error;
            notify(explainGrupoError(err), "error");
            setGestionar(null);
        }
        finally {
            setArticulosLoading(false);
        }
    }
    function toggleArticulo(idArticulo) {
        setSelectedArticulos((current) => {
            const next = new Set(current);
            if (next.has(idArticulo))
                next.delete(idArticulo);
            else
                next.add(idArticulo);
            return next;
        });
    }
    async function handleAsignar() {
        if (!gestionar)
            return;
        setSaving(true);
        try {
            const result = await asignarArticulosGrupo(gestionar.id, [...selectedArticulos]);
            setGestionar(null);
            await reload();
            notify(`Asignación lista: ${Number(result.assigned ?? 0)} agregados y ${Number(result.removed ?? 0)} quitados.`, "success");
        }
        catch (error) {
            const err = error;
            notify(explainGrupoError(err), "error");
        }
        finally {
            setSaving(false);
        }
    }
    if (!perfilLoading && !isAdmin) {
        return (<div>
        <PageHeader title="Gestionar grupos y artículos" description="La gestión de grupos está reservada al rol Administrador."/>
      </div>);
    }
    if (!perfilLoading && !loading && !familia) {
        return (<div>
        <PageHeader title="Gestionar grupos y artículos" description="No encontramos esa familia." actions={<Button variant="secondary" className="w-full lg:w-auto" onClick={() => navigate(SPA_PATHS.familias)}>
              <ArrowLeft size={18} strokeWidth={1.6}/>
              Familias
            </Button>}/>
      </div>);
    }
    const familiaLabel = familia
        ? formatFamiliaGrupo(familia.codigo, familia.descripcion)
        : "";
    return (<div>
      <PageHeader title="Gestionar grupos y artículos" description={familia
            ? `Familia ${familiaLabel}. Cantidad de artículos y costo se calculan solos.`
            : "Detalle de la familia, sus grupos y la asignación de artículos."} actions={isAdmin ? (<>
              <Button variant="secondary" className="w-full lg:w-auto" onClick={() => navigate(SPA_PATHS.familias)}>
                <ArrowLeft size={18} strokeWidth={1.6}/>
                Familias
              </Button>
              <Button className="w-full lg:w-auto" onClick={openCreate} disabled={!familia}>
                <Plus size={18} strokeWidth={1.6}/>
                Cargar grupo
              </Button>
            </>) : null}/>

      <TableShell toolbar={<div className="relative max-w-sm">
            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código o descripción" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
          </div>} empty={!loading && filtered.length === 0
            ? search
                ? "No hay grupos que coincidan con la búsqueda."
                : "Esta familia todavía no tiene grupos."
            : undefined}>
        {loading ? (<TableGhost columns={[
                { label: "Código" },
                { label: "Descripción" },
                { label: "Estado" },
                { label: "Cant. artículos", align: "right" },
                { label: "Costo total", align: "right" },
                { label: "Acciones" },
            ]}/>) : filtered.length > 0 ? (<table className="w-full text-left text-sm">
            <thead className="bg-app-muted text-app-mutedtext">
              <tr>
                <th className="px-4 py-3">
                  <SortButton label="Código" active={sort.key === "codigo"} dir={sort.dir} onClick={() => toggleSort("codigo")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Descripción" active={sort.key === "descripcion"} dir={sort.dir} onClick={() => toggleSort("descripcion")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Estado" active={sort.key === "estado"} dir={sort.dir} onClick={() => toggleSort("estado")}/>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton label="Cant. artículos" active={sort.key === "cant_articulos"} dir={sort.dir} align="right" onClick={() => toggleSort("cant_articulos")}/>
                </th>
                <th className="px-4 py-3 text-right">
                  <SortButton label="Costo total" active={sort.key === "costo_total"} dir={sort.dir} align="right" onClick={() => toggleSort("costo_total")}/>
                </th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const editing = draft?.id === row.id;
                return (<TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle">
                    <td className="px-4 py-3">
                      {editing ? (<input value={draft.codigo} maxLength={20} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} className="w-24 rounded-control border border-app-input px-2 py-1 font-mono text-sm"/>) : (<InternalCode>{row.codigo}</InternalCode>)}
                    </td>
                    <td className="px-4 py-3 font-medium text-app-primary">
                      {editing ? (<input value={draft.descripcion} maxLength={255} onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} className="w-full min-w-[12rem] rounded-control border border-app-input px-2 py-1 text-sm"/>) : (row.descripcion)}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (<EstadoSelect value={draft.estado} onChange={(estado) => setDraft({ ...draft, estado })}/>) : (<EstadoBadge estado={row.estado}/>)}
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
                            <Button variant="table" aria-label="Guardar" disabled={saving} onClick={() => void handleSaveDraft()}>
                              <Check size={18} strokeWidth={1.7}/>
                            </Button>
                            <Button variant="table" aria-label="Cancelar" disabled={saving} onClick={() => setDraft(null)}>
                              <X size={18} strokeWidth={1.7}/>
                            </Button>
                          </>) : (<>
                            <Button variant="table" className="px-2" aria-label={`Gestionar artículos de ${row.descripcion}`} disabled={Boolean(draft)} onClick={() => void openGestionar(row)}>
                              <Package size={18} strokeWidth={1.7}/>
                              <span className="text-xs font-medium">Gestionar</span>
                            </Button>
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
                          </>)}
                      </div>
                    </td>
                  </TableAppearRow>);
            })}
            </tbody>
          </table>) : null}
      </TableShell>

      <FormModal open={createOpen} title="Cargar grupo" description="El código empieza con el de la familia. Solo escribí el texto del grupo." onClose={() => !saving && setCreateOpen(false)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button form="create-grupo" type="submit" disabled={saving || Boolean(createCodeOwner) || !createCode.trim()}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Guardar
            </Button>
          </>}>
        <form id="create-grupo" className="space-y-3" onSubmit={handleCreate}>
          {createError ? <Alert>{createError}</Alert> : null}
          {createCodeOwner?.estado === "inactivo" ? (<div className="rounded-control border border-app-input bg-app-subtle px-3 py-3 text-sm text-app-secondarytext">
              <p>
                Ya existe un grupo con el código “{createCodigoCompleto}” (inactivo: {createCodeOwner.descripcion}). Si querés usar ese código, reactivá ese grupo o eliminalo. Si no, cambiá el texto.
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
              Ya existe un grupo con el código “{createCodigoCompleto}” ({createCodeOwner.descripcion}).
            </Alert>) : null}
          <label className="flex w-full flex-col gap-1.5">
            <span className="text-sm font-medium text-app-secondarytext">Código</span>
            <div className="flex overflow-hidden rounded-control border border-app-input focus-within:border-app-focus focus-within:ring-1 focus-within:ring-app-focus">
              <span className="flex items-center bg-app-muted px-3 font-mono text-sm font-semibold text-app-secondarytext">
                {codigoPrefijo || "—"}
              </span>
              <input
                value={createCode}
                maxLength={Math.max(1, 20 - codigoPrefijo.length)}
                onChange={(event) => setCreateCode(event.target.value.toUpperCase())}
                required
                placeholder="CORC"
                className="min-w-0 flex-1 border-0 bg-app-surface px-3 py-2 font-mono text-sm text-app-primary placeholder:text-app-faint focus:outline-none focus:ring-0"
              />
            </div>
            <span className="text-xs text-app-mutedtext">
              Queda: {createCode.trim() ? createCodigoCompleto : codigoPrefijo || "—"}
            </span>
          </label>
          <Input label="Descripción" value={createName} maxLength={255} onChange={(event) => setCreateName(event.target.value)} required/>
        </form>
      </FormModal>

      <FormModal open={Boolean(gestionar)} title={gestionar
            ? `Gestionar artículos · ${formatFamiliaGrupo(gestionar.codigo, gestionar.descripcion)}`
            : "Gestionar artículos"} description="Los del grupo ya vienen marcados y arriba. Buscá para agregar otros. Al guardar se asignan, se reemplazan o se quitan según el check." className="max-h-[90vh] max-w-5xl overflow-y-auto" onClose={() => !saving && setGestionar(null)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setGestionar(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleAsignar()} disabled={saving || articulosLoading}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Guardar asignación
            </Button>
          </>}>
        <div className="relative">
          <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
          <input value={articuloSearch} onChange={(event) => setArticuloSearch(event.target.value)} placeholder="Buscar artículo por código, nombre, familia o grupo" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
        </div>
        <p className="text-xs text-app-mutedtext">
          {selectedArticulos.size} seleccionados
        </p>
        <div className="max-h-[22rem] overflow-auto rounded-xl border border-app-border-subtle">
          {articulosLoading ? (<p className="px-4 py-8 text-center text-sm text-app-mutedtext">
              Cargando artículos…
            </p>) : articulosVisibles.length === 0 ? (<p className="px-4 py-8 text-center text-sm text-app-mutedtext">
              No hay artículos para mostrar.
            </p>) : (<table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-app-muted text-app-mutedtext">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <span className="sr-only">Seleccionar</span>
                  </th>
                  <th className="px-3 py-2">Cód. familia</th>
                  <th className="px-3 py-2">Cód. grupo</th>
                  <th className="px-3 py-2">Cód. artículo</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Unidad</th>
                  <th className="px-3 py-2">Depósito</th>
                </tr>
              </thead>
              <tbody>
                {articulosVisibles.map((row) => (<tr key={row.id} className="border-t border-app-border-subtle hover:bg-app-subtle">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedArticulos.has(row.id)} onChange={() => toggleArticulo(row.id)} className="h-4 w-4 accent-app-accent" aria-label={`Seleccionar ${row.nombre}`}/>
                    </td>
                    <td className="px-3 py-2">
                      {row.familiaCodigo ? (<InternalCode>{row.familiaCodigo}</InternalCode>) : ("—")}
                    </td>
                    <td className="px-3 py-2">
                      {row.grupoCodigo ? (<InternalCode>{row.grupoCodigo}</InternalCode>) : ("—")}
                    </td>
                    <td className="px-3 py-2">
                      <InternalCode>{row.codigo}</InternalCode>
                    </td>
                    <td className="px-3 py-2 font-medium text-app-primary">
                      {row.nombre}
                    </td>
                    <td className="px-3 py-2 text-app-secondarytext">{row.unidad}</td>
                    <td className="px-3 py-2 text-app-secondarytext">{row.depositos}</td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>
      </FormModal>

      <ConfirmDialog open={Boolean(toDelete)} title="Eliminar grupo" description={toDelete
            ? `Si eliminás “${toDelete.descripcion}”, se borra de forma permanente. No hay vuelta atrás. Los artículos asociados quedan sin grupo; no se borran.`
            : ""} pending={saving} onConfirm={() => void handleDelete()} onClose={() => !saving && setToDelete(null)}/>
    </div>);
}
