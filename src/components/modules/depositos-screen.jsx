import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, ChevronDown, ChevronUp, ChevronsUpDown, Download, Package, Pencil, Plus, Search, Trash2, Upload, Users, X, } from "lucide-react";
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
import { InventarioDepositoModal } from "@/components/modules/inventarios-panels";
import { asignarResponsablesDeposito, createDeposito, desactivarDeposito, eliminarDeposito, explainDepositoError, listDepositos, listDepositosPropios, listResponsablesOpciones, nextDepositoCodigoDesdeActivos, updateDeposito, upsertDepositos, } from "@/services/depositos";
import { downloadDepositosExcel, parseDepositosExcel } from "@/utils/excel-depositos";
import { formatCurrency } from "@/utils/format";

function SortButton({ label, active, dir, align = "left", onClick, }) {
    const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
    return (<button type="button" onClick={onClick} className={`inline-flex items-center gap-1 font-semibold ${align === "right" ? "w-full justify-end" : ""}`}>
      {label}
      <Icon size={14} strokeWidth={1.8} className="text-app-faint"/>
    </button>);
}

export function DepositosScreen() {
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const isAdmin = Boolean(perfil?.esAdministrador);
    const isResponsable = Boolean(perfil?.esResponsableDeposito) && !isAdmin;
    const canView = isAdmin || Boolean(perfil?.esVistaDescarga) || isResponsable;
    const canDownload = isAdmin || Boolean(perfil?.esVistaDescarga);
    const [rows, setRows] = useState([]);
    const [responsables, setResponsables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState({ key: "codigo", dir: "asc" });
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createCode, setCreateCode] = useState("");
    const [createName, setCreateName] = useState("");
    const [createUbicacion, setCreateUbicacion] = useState("");
    const [createError, setCreateError] = useState(null);
    const [confirmAccion, setConfirmAccion] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);
    const [gestionar, setGestionar] = useState(null);
    const [gestionarSearch, setGestionarSearch] = useState("");
    const [selectedResponsables, setSelectedResponsables] = useState(() => new Set());
    const [inventario, setInventario] = useState(null);

    async function reload() {
        const [depositos, opciones] = await Promise.all([
            isResponsable ? listDepositosPropios() : listDepositos(),
            isAdmin ? listResponsablesOpciones() : Promise.resolve([]),
        ]);
        setRows(depositos);
        if (isAdmin)
            setResponsables(opciones);
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
        void reload()
            .catch((error) => {
            if (!cancelled)
                notify(explainDepositoError(error), "error");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [canView, isAdmin, isResponsable, perfilLoading, notify]);

    const suggestedCode = useMemo(() => nextDepositoCodigoDesdeActivos(rows), [rows]);

    function depositoConCodigo(codigo, ignoreId) {
        const key = codigo.trim().toLowerCase();
        if (!key)
            return null;
        return rows.find((row) => row.codigo.toLowerCase() === key && row.id !== ignoreId) ?? null;
    }

    const createCodeOwner = depositoConCodigo(createCode);
    const draftCodeOwner = draft
        ? depositoConCodigo(draft.codigo, draft.id)
        : null;

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const list = term
            ? rows.filter((row) => row.codigo.toLowerCase().includes(term) ||
                row.nombre.toLowerCase().includes(term) ||
                row.ubicacion.toLowerCase().includes(term) ||
                (row.responsableNombres ?? "").toLowerCase().includes(term) ||
                row.estado.toLowerCase().includes(term))
            : rows;
        const dir = sort.dir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            if (sort.key === "cant_articulos" || sort.key === "costo_total") {
                return (Number(a[sort.key] ?? 0) - Number(b[sort.key] ?? 0)) * dir;
            }
            const left = sort.key === "responsable" ? (a.responsableNombres ?? "") : a[sort.key];
            const right = sort.key === "responsable" ? (b.responsableNombres ?? "") : b[sort.key];
            return String(left).localeCompare(String(right), "es", { numeric: true }) * dir;
        });
    }, [rows, search, sort]);

    const responsablesVisibles = useMemo(() => {
        const term = gestionarSearch.trim().toLowerCase();
        const list = term
            ? responsables.filter((row) => selectedResponsables.has(row.id) ||
                row.nombre.toLowerCase().includes(term) ||
                row.apellido.toLowerCase().includes(term) ||
                row.etiqueta.toLowerCase().includes(term))
            : responsables;
        return [...list].sort((a, b) => {
            const aSel = selectedResponsables.has(a.id) ? 0 : 1;
            const bSel = selectedResponsables.has(b.id) ? 0 : 1;
            if (aSel !== bSel)
                return aSel - bSel;
            return a.etiqueta.localeCompare(b.etiqueta, "es");
        });
    }, [responsables, gestionarSearch, selectedResponsables]);

    function toggleSort(key) {
        setSort((current) => current.key === key
            ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
            : { key, dir: key === "cant_articulos" || key === "costo_total" ? "desc" : "asc" });
    }

    function openCreate() {
        setCreateCode(nextDepositoCodigoDesdeActivos(rows));
        setCreateName("");
        setCreateUbicacion("");
        setCreateError(null);
        setCreateOpen(true);
    }

    async function handleCreate(event) {
        event.preventDefault();
        setCreateError(null);
        if (!createCode.trim() || !createName.trim() || !createUbicacion.trim()) {
            setCreateError("Completá código, nombre y ubicación.");
            return;
        }
        if (createCodeOwner)
            return;
        setSaving(true);
        try {
            await createDeposito({
                codigo: createCode,
                nombre: createName,
                ubicacion: createUbicacion,
            });
            setCreateOpen(false);
            await reload();
            notify("Depósito cargado.", "success");
        }
        catch (error) {
            setCreateError(explainDepositoError(error));
        }
        finally {
            setSaving(false);
        }
    }

    async function handleSaveDraft() {
        if (!draft)
            return;
        if (!draft.codigo.trim() || !draft.nombre.trim() || !draft.ubicacion.trim()) {
            notify("Completá código, nombre y ubicación.", "error");
            return;
        }
        if (draftCodeOwner) {
            notify(`El código “${draft.codigo.trim()}” pertenece al depósito “${draftCodeOwner.nombre}”.`, "error");
            return;
        }
        const previa = rows.find((row) => row.id === draft.id);
        if (previa && previa.estado !== "inactivo" && draft.estado === "inactivo" && Number(previa.cant_articulos ?? 0) > 0) {
            notify("Todavía hay artículos en este depósito. Transferilos antes de inactivarlo.", "error");
            return;
        }
        setSaving(true);
        try {
            const updated = await updateDeposito(draft.id, draft);
            setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
            setDraft(null);
            notify(previa && previa.estado !== "inactivo" && updated.estado === "inactivo"
                ? "Depósito actualizado. Ya no se puede usar en movimientos nuevos. El historial se conserva."
                : "Depósito actualizado.", "success");
        }
        catch (error) {
            notify(explainDepositoError(error), "error");
        }
        finally {
            setSaving(false);
        }
    }

    function pedirAccionDeposito(row, forzar) {
        if (forzar === "eliminar" || row.puedeEliminarse) {
            setConfirmAccion({ deposito: row, tipo: "eliminar" });
            return;
        }
        if (row.tieneStock) {
            setConfirmAccion({ deposito: row, tipo: "stock" });
            return;
        }
        setConfirmAccion({ deposito: row, tipo: "desactivar" });
    }

    async function handleConfirmAccion() {
        if (!confirmAccion)
            return;
        if (confirmAccion.tipo === "stock") {
            setConfirmAccion(null);
            return;
        }
        setSaving(true);
        try {
            if (confirmAccion.tipo === "desactivar") {
                const updated = await desactivarDeposito(confirmAccion.deposito);
                setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
                if (draft?.id === confirmAccion.deposito.id)
                    setDraft(null);
                setConfirmAccion(null);
                notify("Depósito desactivado. Ya no se puede usar en movimientos nuevos. El historial se conserva.", "success");
                return;
            }
            await eliminarDeposito(confirmAccion.deposito.id);
            await reload();
            if (draft?.id === confirmAccion.deposito.id)
                setDraft(null);
            setConfirmAccion(null);
            notify("Depósito eliminado.", "success");
        }
        catch (error) {
            notify(explainDepositoError(error), "error");
        }
        finally {
            setSaving(false);
        }
    }

    async function handleReactivar(row) {
        setSaving(true);
        setCreateError(null);
        try {
            await updateDeposito(row.id, {
                codigo: row.codigo,
                nombre: row.nombre,
                ubicacion: row.ubicacion,
                estado: "activo",
            });
            await reload();
            setCreateOpen(false);
            notify(`Se reactivó el depósito “${row.nombre}”.`, "success");
        }
        catch (error) {
            setCreateError(explainDepositoError(error));
        }
        finally {
            setSaving(false);
        }
    }

    function handleDownload() {
        try {
            downloadDepositosExcel(filtered);
            notify(filtered.length === 0
                ? "Se descargó la plantilla de Excel."
                : "Excel descargado.", "success");
        }
        catch (error) {
            notify(error.message || "No se pudo descargar el Excel.", "error");
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
        if (!uploadFile) {
            setUploadError("Seleccioná o arrastrá un Excel.");
            return;
        }
        setSaving(true);
        setUploadError(null);
        try {
            const buffer = await uploadFile.arrayBuffer();
            const parsed = parseDepositosExcel(buffer);
            const result = await upsertDepositos(parsed);
            setUploadOpen(false);
            setUploadFile(null);
            setLoading(true);
            await reload();
            const parts = [];
            if (result.created > 0) {
                parts.push(`${result.created} depósito${result.created === 1 ? "" : "s"} nuevo${result.created === 1 ? "" : "s"}`);
            }
            if (result.updated > 0) {
                parts.push(`${result.updated} actualizado${result.updated === 1 ? "" : "s"}`);
            }
            notify(parts.length === 0
                ? "Carga masiva lista: ningún depósito cambió."
                : `Carga masiva lista: ${parts.join(" y ")}.`, "success");
        }
        catch (error) {
            setUploadError(explainDepositoError(error));
        }
        finally {
            setSaving(false);
            setLoading(false);
        }
    }

    async function openGestionar(row) {
        setGestionar(row);
        setGestionarSearch("");
        setSelectedResponsables(new Set(row.responsableIds ?? []));
        try {
            const opciones = await listResponsablesOpciones();
            setResponsables(opciones);
        }
        catch (error) {
            notify(explainDepositoError(error), "error");
            setGestionar(null);
        }
    }

    function toggleResponsable(id) {
        setSelectedResponsables((current) => {
            const next = new Set(current);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }

    async function handleAsignar() {
        if (!gestionar)
            return;
        setSaving(true);
        try {
            const result = await asignarResponsablesDeposito(gestionar.id, [...selectedResponsables]);
            setGestionar(null);
            await reload();
            notify(`Responsables actualizados: ${Number(result.assigned ?? 0)} agregados y ${Number(result.removed ?? 0)} quitados.`, "success");
        }
        catch (error) {
            notify(explainDepositoError(error), "error");
        }
        finally {
            setSaving(false);
        }
    }

    if (perfilLoading) {
        return (<div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>);
    }

    if (!canView) {
        return (<section>
        <PageHeader title="Depósitos" description="No tenés permiso para ver depósitos."/>
        <Alert>Tu usuario no puede ver depósitos.</Alert>
      </section>);
    }

    return (<section>
      <PageHeader title="Depósitos" description={isAdmin
            ? "Código, ubicación y responsables. La cantidad de artículos y el costo se calculan solos. El estado se cambia con Editar. Los responsables se asignan con Gestionar responsables."
            : isResponsable
                ? "Tus depósitos asignados, con cantidad de artículos, costo total e inventario."
                : "Consulta y descarga de depósitos. No se pueden crear, editar ni asignar responsables."} actions={<>
            {canDownload ? (
            <Button variant="secondary" className="w-full lg:w-auto" onClick={handleDownload} disabled={loading}>
              <Download size={18} strokeWidth={1.6}/>
              Descargar Excel
            </Button>
            ) : null}
            {isAdmin ? (<>
                <Button variant="secondary" className="w-full lg:w-auto" onClick={() => {
                    setUploadError(null);
                    setUploadFile(null);
                    setUploadOpen(true);
                }}>
                  <Upload size={18} strokeWidth={1.6}/>
                  Carga masiva
                </Button>
                <Button className="w-full lg:w-auto" onClick={openCreate}>
                  <Plus size={18} strokeWidth={1.6}/>
                  Cargar nuevo depósito
                </Button>
              </>) : null}
          </>}/>

      <TableShell toolbar={<label className="relative block max-w-md">
            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre, ubicación o responsable" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
          </label>} empty={loading
            ? undefined
            : filtered.length === 0
                ? search.trim()
                    ? "No hay depósitos que coincidan con la búsqueda."
                    : isResponsable
                    ? "No tenés depósitos asignados."
                    : "Todavía no hay depósitos."
                : undefined}>
        {loading ? (<TableGhost minWidth="64rem" columns={[
                { label: "Código" },
                { label: "Nombre" },
                { label: "Ubicación" },
                { label: "Responsables" },
                { label: "Estado" },
                { label: "Cant. artículos", align: "right" },
                { label: "Costo total", align: "right" },
                { label: "Acciones", align: "right" },
            ]}/>) : filtered.length > 0 ? (<table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="bg-app-muted text-app-mutedtext">
              <tr>
                <th className="px-4 py-3">
                  <SortButton label="Código" active={sort.key === "codigo"} dir={sort.dir} onClick={() => toggleSort("codigo")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Nombre" active={sort.key === "nombre"} dir={sort.dir} onClick={() => toggleSort("nombre")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Ubicación" active={sort.key === "ubicacion"} dir={sort.dir} onClick={() => toggleSort("ubicacion")}/>
                </th>
                <th className="px-4 py-3">
                  <SortButton label="Responsables" active={sort.key === "responsable"} dir={sort.dir} onClick={() => toggleSort("responsable")}/>
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
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const editing = draft?.id === row.id;
                return (<TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                    <td className="px-4 py-3">
                      {editing ? (<input value={draft.codigo} maxLength={40} onChange={(event) => setDraft({ ...draft, codigo: event.target.value })} className="w-24 rounded-control border border-app-input px-2 py-1.5 font-mono text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (<InternalCode>{row.codigo}</InternalCode>)}
                    </td>
                    <td className="px-4 py-3 font-medium text-app-primary">
                      {editing ? (<input value={draft.nombre} maxLength={160} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} className="w-full min-w-[10rem] rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (row.nombre)}
                    </td>
                    <td className="px-4 py-3 text-app-secondarytext">
                      {editing ? (<input value={draft.ubicacion} maxLength={255} onChange={(event) => setDraft({ ...draft, ubicacion: event.target.value })} className="w-full min-w-[10rem] rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (row.ubicacion)}
                    </td>
                    <td className="px-4 py-3 text-app-secondarytext">
                      {row.responsableNombres || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <EstadoSelect
                          value={draft.estado}
                          onChange={(estado) => {
                            if (estado === "inactivo" && Number(row.cant_articulos ?? 0) > 0) return;
                            setDraft({ ...draft, estado });
                          }}
                          inactivoDisabled={Number(row.cant_articulos ?? 0) > 0}
                        />
                      ) : (<EstadoBadge estado={row.estado}/>)}
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
                            <Button variant="table" className="px-2" aria-label={`Ver inventario de ${row.nombre}`} disabled={Boolean(draft)} onClick={() => setInventario(row)}>
                              <Package size={18} strokeWidth={1.7}/>
                              <span className="text-xs font-medium">Inventario</span>
                            </Button>
                            {isAdmin ? (<>
                            <Button variant="table" className="px-2" aria-label={`Gestionar responsables de ${row.nombre}`} disabled={Boolean(draft)} onClick={() => void openGestionar(row)}>
                              <Users size={18} strokeWidth={1.7}/>
                              <span className="text-xs font-medium">Gestionar</span>
                            </Button>
                            <Button variant="table" aria-label={`Editar ${row.nombre}`} disabled={Boolean(draft)} onClick={() => setDraft({
                            id: row.id,
                            codigo: row.codigo,
                            nombre: row.nombre,
                            ubicacion: row.ubicacion,
                            estado: row.estado,
                        })}>
                              <Pencil size={18} strokeWidth={1.7}/>
                            </Button>
                            {row.puedeEliminarse ? (
                            <Button variant="table" aria-label={`Eliminar ${row.nombre}`} disabled={Boolean(draft)} onClick={() => pedirAccionDeposito(row, "eliminar")}>
                              <Trash2 size={18} strokeWidth={1.7}/>
                            </Button>
                            ) : row.estado === "activo" && !row.tieneStock ? (
                            <Button variant="table" aria-label={`Desactivar ${row.nombre}`} disabled={Boolean(draft)} onClick={() => pedirAccionDeposito(row)}>
                              <Ban size={18} strokeWidth={1.7}/>
                            </Button>
                            ) : null}
                            </>) : null}
                          </>)}
                      </div>
                    </td>
                  </TableAppearRow>);
            })}
            </tbody>
          </table>) : null}
      </TableShell>

      <FormModal open={createOpen} title="Cargar nuevo depósito" description="El código se sugiere en correlativo de tres dígitos según los activos. Los responsables se asignan después, con Gestionar responsables." onClose={() => !saving && setCreateOpen(false)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button form="create-deposito" type="submit" disabled={saving || Boolean(createCodeOwner)}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Guardar
            </Button>
          </>}>
        <form id="create-deposito" className="space-y-3" onSubmit={handleCreate}>
          {createError ? <Alert>{createError}</Alert> : null}
          {createCodeOwner?.estado === "inactivo" ? (<div className="rounded-control border border-app-input bg-app-subtle px-3 py-3 text-sm text-app-secondarytext">
              <p>
                Ya existe un depósito con el código “{createCode.trim()}” (inactivo: {createCodeOwner.nombre}). Si querés usar ese código, reactivá ese depósito o eliminalo. Si no, cambiá el código.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" disabled={saving} onClick={() => void handleReactivar(createCodeOwner)}>
                  Reactivar
                </Button>
                {createCodeOwner.puedeEliminarse ? (
                <Button type="button" variant="danger" disabled={saving} onClick={() => pedirAccionDeposito(createCodeOwner, "eliminar")}>
                  Eliminar
                </Button>
                ) : null}
              </div>
            </div>) : createCodeOwner ? (<Alert>
              El código “{createCode.trim()}” pertenece al depósito “{createCodeOwner.nombre}”.
            </Alert>) : null}
          <Input label="Código" value={createCode} maxLength={40} onChange={(event) => setCreateCode(event.target.value)} required hint={<span className="text-xs text-app-mutedtext">Sugerido: {suggestedCode}</span>}/>
          <Input label="Nombre" value={createName} maxLength={160} onChange={(event) => setCreateName(event.target.value)} required/>
          <Input label="Ubicación" value={createUbicacion} maxLength={255} onChange={(event) => setCreateUbicacion(event.target.value)} required/>
        </form>
      </FormModal>

      <FormModal open={uploadOpen} title="Carga masiva de depósitos" description="Usá el mismo Excel que descarga la plataforma. Mismo código y mismos datos = no se toca. No se reactivan inactivos ni se asignan responsables." onClose={() => !saving && setUploadOpen(false)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setUploadOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleUpload()} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Cargar Excel
            </Button>
          </>}>
        {uploadError ? <Alert>{uploadError}</Alert> : null}
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
            Columnas: Código, Nombre y Ubicación
          </span>
          {uploadFile ? (<span className="mt-3 rounded-pill bg-app-surface px-3 py-1 text-xs font-medium text-app-secondarytext">
              {uploadFile.name}
            </span>) : null}
        </button>
      </FormModal>

      <FormModal open={Boolean(gestionar)} title={gestionar
            ? `Gestionar responsables · ${gestionar.nombre}`
            : "Gestionar responsables"} description="Los asignados a este depósito vienen marcados y siempre arriba. Buscá por nombre o apellido. Al guardar se agregan, se reemplazan o se quitan según el check." className="max-h-[90vh] max-w-3xl overflow-y-auto" onClose={() => !saving && setGestionar(null)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setGestionar(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleAsignar()} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Guardar asignación
            </Button>
          </>}>
        <div className="relative">
          <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
          <input value={gestionarSearch} onChange={(event) => setGestionarSearch(event.target.value)} placeholder="Buscar por nombre o apellido" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
        </div>
        <p className="text-xs text-app-mutedtext">
          {selectedResponsables.size} seleccionados
        </p>
        <div className="max-h-[22rem] overflow-auto rounded-xl border border-app-border-subtle">
          {responsablesVisibles.length === 0 ? (<p className="px-4 py-8 text-center text-sm text-app-mutedtext">
              No hay usuarios para mostrar.
            </p>) : (<table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-app-muted text-app-mutedtext">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <span className="sr-only">Seleccionar</span>
                  </th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Apellido</th>
                </tr>
              </thead>
              <tbody>
                {responsablesVisibles.map((row) => (<tr key={row.id} className="border-t border-app-border-subtle hover:bg-app-subtle">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedResponsables.has(row.id)} onChange={() => toggleResponsable(row.id)} className="h-4 w-4 accent-app-accent" aria-label={`Seleccionar ${row.etiqueta}`}/>
                    </td>
                    <td className="px-3 py-2 font-medium text-app-primary">{row.nombre}</td>
                    <td className="px-3 py-2 text-app-secondarytext">{row.apellido}</td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>
      </FormModal>

      {inventario ? <InventarioDepositoModal deposito={inventario} onClose={() => setInventario(null)} /> : null}

      <ConfirmDialog
        open={Boolean(confirmAccion)}
        title={confirmAccion?.tipo === "eliminar"
          ? "Eliminar depósito"
          : confirmAccion?.tipo === "stock"
            ? "No se puede desactivar"
            : "Desactivar depósito"}
        description={!confirmAccion
          ? ""
          : confirmAccion.tipo === "eliminar"
            ? `Si confirmás, se elimina “${confirmAccion.deposito.nombre}” de forma permanente y se quitan las asignaciones de responsables. No hay vuelta atrás.`
            : confirmAccion.tipo === "stock"
              ? `“${confirmAccion.deposito.nombre}” todavía tiene ${confirmAccion.deposito.cant_articulos} artículo${Number(confirmAccion.deposito.cant_articulos) === 1 ? "" : "s"}. Transferilos antes de desactivarlo. No se puede eliminar porque ${confirmAccion.deposito.tieneMovimientos ? "tiene movimientos en el historial" : "tiene stock"}.`
              : `“${confirmAccion.deposito.nombre}” tiene movimientos en el historial, por eso no se puede eliminar. Si confirmás, se desactiva y ya no se va a poder usar en movimientos nuevos. El historial se conserva.`}
        confirmLabel={confirmAccion?.tipo === "desactivar" ? "Desactivar" : "Eliminar"}
        cancelLabel={confirmAccion?.tipo === "stock" ? "Entendido" : "Cancelar"}
        confirmVariant={confirmAccion?.tipo === "desactivar" ? "primary" : "danger"}
        showConfirm={confirmAccion?.tipo !== "stock"}
        pending={saving}
        lockClose={saving}
        onConfirm={() => void handleConfirmAccion()}
        onClose={() => !saving && setConfirmAccion(null)}
      />
    </section>);
}
