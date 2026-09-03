import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
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
import { createProveedor, eliminarProveedor, explainProveedorError, listProveedores, nextProveedorCodigoDesdeActivos, updateProveedor, upsertProveedores, } from "@/services/proveedores";
import { downloadProveedoresExcel, parseProveedoresExcel } from "@/utils/excel-proveedores";

export function ProveedoresScreen() {
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [createCode, setCreateCode] = useState("");
    const [createName, setCreateName] = useState("");
    const [createError, setCreateError] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);
    const isAdmin = Boolean(perfil?.esAdministrador);

    async function reload() {
        const data = await listProveedores();
        setRows(data);
    }

    useEffect(() => {
        if (perfilLoading)
            return;
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        reload()
            .catch((error) => {
            notify(explainProveedorError(error), "error");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [isAdmin, perfilLoading, notify]);

    const suggestedCode = useMemo(() => nextProveedorCodigoDesdeActivos(rows), [rows]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term)
            return rows;
        return rows.filter((row) => row.cod_proveedor.toLowerCase().includes(term) ||
            row.razon_social.toLowerCase().includes(term) ||
            row.estado.toLowerCase().includes(term));
    }, [rows, search]);

    function proveedorConCodigo(codigo, ignoreId) {
        const key = codigo.trim().toLowerCase();
        if (!key)
            return null;
        return (rows.find((row) => row.cod_proveedor.toLowerCase() === key && row.id !== ignoreId) ?? null);
    }

    const createCodeOwner = proveedorConCodigo(createCode);
    const draftCodeOwner = draft
        ? proveedorConCodigo(draft.cod_proveedor, draft.id)
        : null;

    function openCreate() {
        setCreateError(null);
        setCreateCode(nextProveedorCodigoDesdeActivos(rows));
        setCreateName("");
        setCreateOpen(true);
    }

    async function handleCreate(event) {
        event.preventDefault();
        setCreateError(null);
        if (!createCode.trim() || !createName.trim()) {
            setCreateError("Completá código y razón social.");
            return;
        }
        if (createCodeOwner) {
            setCreateError(`El código “${createCode.trim()}” pertenece al proveedor “${createCodeOwner.razon_social}”.`);
            return;
        }
        setSaving(true);
        try {
            await createProveedor({
                cod_proveedor: createCode,
                razon_social: createName,
            });
            await reload();
            setCreateOpen(false);
            notify("Proveedor cargado.", "success");
        }
        catch (error) {
            const err = error;
            setCreateError(explainProveedorError(err));
        }
        finally {
            setSaving(false);
        }
    }

    async function handleSaveEdit() {
        if (!draft)
            return;
        if (!draft.cod_proveedor.trim() || !draft.razon_social.trim()) {
            notify("Completá código y razón social.", "error");
            return;
        }
        if (draftCodeOwner) {
            notify(`El código “${draft.cod_proveedor.trim()}” pertenece al proveedor “${draftCodeOwner.razon_social}”.`, "error");
            return;
        }
        setSaving(true);
        try {
            const previa = rows.find((row) => row.id === draft.id);
            const updated = await updateProveedor(draft.id, {
                cod_proveedor: draft.cod_proveedor,
                razon_social: draft.razon_social,
                estado: draft.estado,
            });
            setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
            setDraft(null);
            notify(previa && previa.estado !== "inactivo" && updated.estado === "inactivo"
                ? "Proveedor actualizado. Quedó desvinculado de los movimientos."
                : "Proveedor actualizado.", "success");
        }
        catch (error) {
            const err = error;
            notify(explainProveedorError(err), "error");
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
            await eliminarProveedor(toDelete.id);
            await reload();
            if (draft?.id === toDelete.id)
                setDraft(null);
            setToDelete(null);
            notify("Proveedor eliminado. Quedó desvinculado de los movimientos.", "success");
        }
        catch (error) {
            const err = error;
            notify(explainProveedorError(err), "error");
        }
        finally {
            setSaving(false);
        }
    }

    async function handleReactivar(row) {
        setSaving(true);
        setCreateError(null);
        try {
            await updateProveedor(row.id, {
                cod_proveedor: row.cod_proveedor,
                razon_social: row.razon_social,
                estado: "activo",
            });
            await reload();
            setCreateOpen(false);
            notify(`Se reactivó el proveedor “${row.razon_social}”.`, "success");
        }
        catch (error) {
            const err = error;
            setCreateError(explainProveedorError(err));
        }
        finally {
            setSaving(false);
        }
    }

    function handleDownload() {
        try {
            downloadProveedoresExcel(filtered);
            notify(filtered.length === 0
                ? "Se descargó la plantilla de Excel."
                : "Excel descargado.", "success");
        }
        catch (error) {
            const err = error;
            notify(err.message || "No se pudo descargar el Excel.", "error");
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
            const parsed = parseProveedoresExcel(buffer);
            const result = await upsertProveedores(parsed);
            setUploadOpen(false);
            setUploadFile(null);
            setLoading(true);
            await reload();
            const parts = [];
            if (result.created > 0) {
                parts.push(`${result.created} proveedor${result.created === 1 ? "" : "es"} nuevo${result.created === 1 ? "" : "s"}`);
            }
            if (result.updated > 0) {
                parts.push(`${result.updated} actualizado${result.updated === 1 ? "" : "s"}`);
            }
            notify(parts.length === 0
                ? "Carga masiva lista: ningún proveedor cambió."
                : `Carga masiva lista: ${parts.join(" y ")}.`, "success");
        }
        catch (error) {
            const err = error;
            setUploadError(explainProveedorError(err));
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

    if (!isAdmin) {
        return (<section>
        <PageHeader title="Proveedores" description="La gestión de proveedores está reservada al rol Administrador."/>
        <Alert>Tu usuario no puede cargar, editar ni eliminar proveedores.</Alert>
      </section>);
    }

    return (<section>
      <PageHeader title="Proveedores" description="Alta y edición. El estado se cambia con Editar. Eliminar es definitivo: el proveedor queda desvinculado de los movimientos." actions={<>
            <Button variant="secondary" className="w-full lg:w-auto" onClick={handleDownload} disabled={loading}>
              <Download size={18} strokeWidth={1.6}/>
              Descargar Excel
            </Button>
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
              Cargar nuevo proveedor
            </Button>
          </>}/>

      <TableShell toolbar={<label className="relative block max-w-md">
            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, razón social o estado" className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>
          </label>} empty={loading
            ? undefined
            : filtered.length === 0
                ? search.trim()
                    ? "No hay proveedores que coincidan con la búsqueda."
                    : "Todavía no hay proveedores."
                : undefined}>
        {loading ? (<TableGhost columns={[
                { label: "Código" },
                { label: "Razón social" },
                { label: "Estado" },
                { label: "Acciones", align: "right" },
            ]}/>) : filtered.length > 0 ? (<table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-app-muted text-app-mutedtext">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Razón social</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const editing = draft?.id === row.id;
                return (<TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                    <td className="px-4 py-3">
                      {editing ? (<input value={draft.cod_proveedor} onChange={(event) => setDraft({ ...draft, cod_proveedor: event.target.value })} maxLength={40} className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (<InternalCode>{row.cod_proveedor}</InternalCode>)}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (<input value={draft.razon_social} onChange={(event) => setDraft({ ...draft, razon_social: event.target.value })} maxLength={255} className="w-full rounded-control border border-app-input px-2 py-1.5 text-sm focus:border-app-focus focus:ring-1 focus:ring-app-focus"/>) : (<span className="font-medium text-app-primary">
                          {row.razon_social}
                        </span>)}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (<EstadoSelect value={draft.estado} onChange={(estado) => setDraft({ ...draft, estado })}/>) : (<EstadoBadge estado={row.estado}/>)}
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
                            <Button variant="table" aria-label={`Editar ${row.razon_social}`} disabled={Boolean(draft)} onClick={() => setDraft({
                            id: row.id,
                            cod_proveedor: row.cod_proveedor,
                            razon_social: row.razon_social,
                            estado: row.estado,
                        })}>
                              <Pencil size={18} strokeWidth={1.7}/>
                            </Button>
                            <Button variant="table" aria-label={`Eliminar ${row.razon_social}`} disabled={Boolean(draft)} onClick={() => setToDelete(row)}>
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

      <FormModal open={createOpen} title="Cargar nuevo proveedor" description="El código se sugiere en correlativo de tres dígitos según los activos. Podés cambiarlo." onClose={() => !saving && setCreateOpen(false)} footer={<>
            <Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button form="create-proveedor" type="submit" disabled={saving || Boolean(createCodeOwner)}>
              {saving ? <Spinner className="h-4 w-4 text-white"/> : null}
              Guardar
            </Button>
          </>}>
        <form id="create-proveedor" className="space-y-3" onSubmit={handleCreate}>
          {createError ? <Alert>{createError}</Alert> : null}
          {createCodeOwner?.estado === "inactivo" ? (<div className="rounded-control border border-app-input bg-app-subtle px-3 py-3 text-sm text-app-secondarytext">
              <p>
                Ya existe un proveedor con el código “{createCode.trim()}” (inactivo: {createCodeOwner.razon_social}). Si querés usar ese código, reactivá ese proveedor o eliminalo. Si no, cambiá el código.
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
              Ya existe un proveedor con el código “{createCode.trim()}” ({createCodeOwner.razon_social}).
            </Alert>) : null}
          <Input label="Código" value={createCode} maxLength={40} onChange={(event) => setCreateCode(event.target.value)} required hint={<span className="text-xs text-app-mutedtext">
                Sugerido: {suggestedCode}
              </span>}/>
          <Input label="Razón social" value={createName} maxLength={255} onChange={(event) => setCreateName(event.target.value)} required/>
        </form>
      </FormModal>

      <FormModal open={uploadOpen} title="Carga masiva de proveedores" description="Usá el mismo Excel que descarga la plataforma. Mismo código y mismos datos = no se toca. No se reactivan inactivos ni se eliminan filas." onClose={() => !saving && setUploadOpen(false)} footer={<>
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
            Columnas: Código y Razón social
          </span>
          {uploadFile ? (<span className="mt-3 rounded-pill bg-app-surface px-3 py-1 text-xs font-medium text-app-secondarytext">
              {uploadFile.name}
            </span>) : null}
        </button>
      </FormModal>

      <ConfirmDialog open={Boolean(toDelete)} title="Eliminar proveedor" description={toDelete
            ? `Si eliminás “${toDelete.razon_social}”, se borra de forma permanente. No hay vuelta atrás. Queda desvinculado de todos los movimientos; los movimientos no se borran.`
            : ""} pending={saving} onConfirm={() => void handleDelete()} onClose={() => !saving && setToDelete(null)}/>
    </section>);
}
