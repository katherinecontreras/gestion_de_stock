import { useEffect, useMemo, useState } from "react";
import { Ban, Pencil, Search, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/modals/confirm-dialog";
import { FormModal } from "@/components/modals/form-modal";
import { Alert } from "@/components/ui/alert";
import { Badge, EstadoBadge, EstadoSelect } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { TableAppearRow, TableGhost, TableShell } from "@/components/ui/table";
import { usePerfilSesion } from "@/hooks/use-perfil-sesion";
import { useToast } from "@/app/layouts/ToastProvider";
import { listDepositosActivos } from "@/services/depositos";
import {
    ROL_OPCIONES,
    actualizarResponsable,
    desactivarResponsable,
    eliminarResponsable,
    explainResponsableError,
    listResponsablesAdmin,
} from "@/services/responsables";

function emptyDraft(row) {
    return {
        id: row.id,
        nombre: row.nombre,
        apellido: row.apellido,
        dni: row.dni,
        email: row.email,
        rol: row.rol ?? "Vista_Descarga",
        estado: row.estado,
        depositos: new Set(row.depositoIds ?? []),
    };
}

export function ResponsablesScreen() {
    const { perfil, loading: perfilLoading } = usePerfilSesion();
    const { notify } = useToast();
    const [rows, setRows] = useState([]);
    const [depositos, setDepositos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [rolFiltro, setRolFiltro] = useState("");
    const [draft, setDraft] = useState(null);
    const [depositoSearch, setDepositoSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState(null);
    const [confirmAccion, setConfirmAccion] = useState(null);

    const isAdmin = Boolean(perfil?.esAdministrador);
    const canView = isAdmin || Boolean(perfil?.esVistaDescarga);
    const canWrite = isAdmin;

    async function reload() {
        const [personas, deps] = await Promise.all([
            listResponsablesAdmin(),
            isAdmin ? listDepositosActivos() : Promise.resolve([]),
        ]);
        setRows(personas);
        setDepositos(deps);
    }

    useEffect(() => {
        if (perfilLoading) return;
        if (!canView) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        reload()
            .catch((error) => {
                if (!cancelled) notify(explainResponsableError(error), "error");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [canView, isAdmin, perfilLoading, notify]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (rolFiltro && row.rol !== rolFiltro) return false;
            if (!term) return true;
            return `${row.nombre} ${row.apellido} ${row.dni} ${row.email} ${row.rolLabel}`.toLowerCase().includes(term);
        });
    }, [rows, search, rolFiltro]);

    const depositosVisibles = useMemo(() => {
        const term = depositoSearch.trim().toLowerCase();
        const selected = draft?.depositos ?? new Set();
        const list = term
            ? depositos.filter((row) => `${row.codigo} ${row.nombre} ${row.ubicacion}`.toLowerCase().includes(term))
            : depositos;
        return [...list].sort((a, b) => {
            const aSel = selected.has(a.id) ? 0 : 1;
            const bSel = selected.has(b.id) ? 0 : 1;
            if (aSel !== bSel) return aSel - bSel;
            return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
        });
    }, [depositos, depositoSearch, draft]);

    function openEdit(row) {
        setFormError(null);
        setDepositoSearch("");
        setDraft(emptyDraft(row));
    }

    function toggleDeposito(id) {
        setDraft((current) => {
            if (!current) return current;
            const next = new Set(current.depositos);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return { ...current, depositos: next };
        });
    }

    async function handleSave() {
        if (!draft) return;
        if (!draft.nombre.trim() || !draft.apellido.trim() || !draft.dni.trim()) {
            setFormError("Completá nombre, apellido y DNI.");
            return;
        }
        if (draft.rol === "Responsable_Deposito" && draft.depositos.size < 1) {
            setFormError("Un responsable de depósito tiene que tener al menos un depósito.");
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            await actualizarResponsable({
                id: draft.id,
                nombre: draft.nombre,
                apellido: draft.apellido,
                dni: draft.dni,
                rol: draft.rol,
                estado: draft.estado,
                depositos: [...draft.depositos],
            });
            await reload();
            setDraft(null);
            notify("Responsable actualizado.", "success");
        } catch (error) {
            setFormError(explainResponsableError(error));
        } finally {
            setSaving(false);
        }
    }

    function pedirAccion(row, tipo) {
        if (tipo === "eliminar" || row.puedeEliminarse) {
            setConfirmAccion({ row, tipo: "eliminar" });
            return;
        }
        if (row.esUltimoAdminActivo) {
            setConfirmAccion({ row, tipo: "ultimo-admin" });
            return;
        }
        setConfirmAccion({ row, tipo: "desactivar" });
    }

    async function handleConfirmAccion() {
        if (!confirmAccion) return;
        if (confirmAccion.tipo === "ultimo-admin") {
            setConfirmAccion(null);
            return;
        }
        setSaving(true);
        try {
            if (confirmAccion.tipo === "desactivar") {
                await desactivarResponsable(confirmAccion.row);
                await reload();
                if (draft?.id === confirmAccion.row.id) setDraft(null);
                setConfirmAccion(null);
                notify("Responsable desactivado. Ya no puede ingresar. El historial se conserva.", "success");
                return;
            }
            await eliminarResponsable(confirmAccion.row.id);
            await reload();
            if (draft?.id === confirmAccion.row.id) setDraft(null);
            setConfirmAccion(null);
            notify("Responsable eliminado.", "success");
        } catch (error) {
            notify(explainResponsableError(error), "error");
        } finally {
            setSaving(false);
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
                <PageHeader title="Administración de responsables" description="Solo el Administrador y Vista y descarga pueden ver esta página." />
                <Alert>Tu usuario no puede ver responsables.</Alert>
            </section>
        );
    }

    return (
        <section>
            <PageHeader
                title="Administración de responsables"
                description={canWrite
                    ? "Editar rol, estado y depósitos. El alta es el registro: acá no se crea ni se invita. El email de ingreso no se cambia."
                    : "Consulta de responsables. Sin editar ni eliminar."}
            />

            <TableShell
                toolbar={(
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <label className="relative block min-w-0 flex-1">
                            <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por nombre, apellido, DNI o email"
                                className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                            />
                        </label>
                        <select
                            value={rolFiltro}
                            onChange={(event) => setRolFiltro(event.target.value)}
                            className="w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus lg:w-64"
                        >
                            <option value="">Todos los roles</option>
                            {ROL_OPCIONES.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                )}
                empty={loading
                    ? undefined
                    : filtered.length === 0
                        ? search.trim() || rolFiltro
                            ? "No hay responsables que coincidan con la búsqueda."
                            : "Todavía no hay responsables."
                        : undefined}
            >
                {loading ? (
                    <TableGhost columns={[
                        { label: "Nombre" },
                        { label: "Apellido" },
                        { label: "DNI" },
                        { label: "Email" },
                        { label: "Rol" },
                        { label: "Estado" },
                        { label: "Acciones", align: "right" },
                    ]} />
                ) : filtered.length > 0 ? (
                    <table className="w-full min-w-[56rem] text-left text-sm">
                        <thead className="bg-app-muted text-app-mutedtext">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Nombre</th>
                                <th className="px-4 py-3 font-semibold">Apellido</th>
                                <th className="px-4 py-3 font-semibold">DNI</th>
                                <th className="px-4 py-3 font-semibold">Email</th>
                                <th className="px-4 py-3 font-semibold">Rol</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, index) => (
                                <TableAppearRow key={row.id} index={index} className="border-t border-app-border-subtle align-middle">
                                    <td className="px-4 py-3 font-medium text-app-primary">{row.nombre}</td>
                                    <td className="px-4 py-3 text-app-primary">{row.apellido}</td>
                                    <td className="px-4 py-3 font-mono text-app-secondarytext">{row.dni}</td>
                                    <td className="px-4 py-3 text-app-secondarytext">{row.email}</td>
                                    <td className="px-4 py-3">
                                        <Badge tone={row.rol === "Administrador" ? "own" : row.rol === "Responsable_Deposito" ? "assign" : "neutral"}>
                                            {row.rolLabel}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <EstadoBadge estado={row.estado} />
                                    </td>
                                    <td className="px-4 py-3">
                                        {canWrite ? (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="table" aria-label={`Editar ${row.etiqueta}`} onClick={() => openEdit(row)}>
                                                    <Pencil size={18} strokeWidth={1.7} />
                                                </Button>
                                                {row.id !== perfil?.id && row.puedeEliminarse ? (
                                                    <Button variant="table" aria-label={`Eliminar ${row.etiqueta}`} onClick={() => pedirAccion(row, "eliminar")}>
                                                        <Trash2 size={18} strokeWidth={1.7} />
                                                    </Button>
                                                ) : row.id !== perfil?.id && row.estado === "activo" && !row.esUltimoAdminActivo ? (
                                                    <Button variant="table" aria-label={`Desactivar ${row.etiqueta}`} onClick={() => pedirAccion(row, "desactivar")}>
                                                        <Ban size={18} strokeWidth={1.7} />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <span className="block text-right text-app-faint">—</span>
                                        )}
                                    </td>
                                </TableAppearRow>
                            ))}
                        </tbody>
                    </table>
                ) : null}
            </TableShell>

            <FormModal
                open={Boolean(draft)}
                title={draft ? `Editar · ${draft.nombre} ${draft.apellido}` : "Editar responsable"}
                description="El mail es el de ingreso: se muestra y no se cambia. Si el rol es responsable de depósito, asigná al menos uno."
                className="max-w-3xl"
                onClose={() => !saving && setDraft(null)}
                footer={(
                    <>
                        <Button variant="secondary" disabled={saving} onClick={() => setDraft(null)}>Cancelar</Button>
                        <Button disabled={saving} onClick={() => void handleSave()}>
                            {saving ? <Spinner className="h-4 w-4 text-white" /> : null}
                            Guardar
                        </Button>
                    </>
                )}
            >
                {draft ? (
                    <div className="space-y-3">
                        {formError ? <Alert>{formError}</Alert> : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Input label="Nombre" value={draft.nombre} maxLength={120} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} />
                            <Input label="Apellido" value={draft.apellido} maxLength={120} onChange={(event) => setDraft({ ...draft, apellido: event.target.value })} />
                            <Input label="DNI" value={draft.dni} maxLength={20} onChange={(event) => setDraft({ ...draft, dni: event.target.value })} />
                            <Input label="Email" value={draft.email} disabled hint={<span className="text-xs text-app-mutedtext">No se cambia: es el mail de ingreso.</span>} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex w-full flex-col gap-1.5">
                                <span className="text-sm font-medium text-app-secondarytext">Rol</span>
                                <select
                                    value={draft.rol}
                                    onChange={(event) => setDraft({ ...draft, rol: event.target.value })}
                                    className="w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                                >
                                    {ROL_OPCIONES.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex w-full flex-col gap-1.5">
                                <span className="text-sm font-medium text-app-secondarytext">Estado</span>
                                <EstadoSelect
                                    value={draft.estado}
                                    onChange={(estado) => {
                                        const actual = rows.find((item) => item.id === draft.id);
                                        if (estado === "inactivo" && actual?.esUltimoAdminActivo) return;
                                        setDraft({ ...draft, estado });
                                    }}
                                    inactivoDisabled={Boolean(rows.find((item) => item.id === draft.id)?.esUltimoAdminActivo)}
                                    inactivoHint="No se puede dejar la plataforma sin un administrador activo."
                                />
                            </label>
                        </div>
                        {draft.rol === "Responsable_Deposito" ? (
                            <div>
                                <p className="mb-2 text-sm font-medium text-app-secondarytext">Depósitos</p>
                                <div className="relative mb-2">
                                    <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                                    <input
                                        value={depositoSearch}
                                        onChange={(event) => setDepositoSearch(event.target.value)}
                                        placeholder="Buscar depósito"
                                        className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                                    />
                                </div>
                                <div className="max-h-56 overflow-auto rounded-control border border-app-border">
                                    {depositosVisibles.length === 0 ? (
                                        <p className="px-3 py-6 text-center text-sm text-app-mutedtext">No hay depósitos activos.</p>
                                    ) : depositosVisibles.map((dep) => (
                                        <label key={dep.id} className="flex cursor-pointer items-center gap-3 border-t border-app-border-subtle px-3 py-2 text-sm first:border-t-0 hover:bg-app-subtle">
                                            <input
                                                type="checkbox"
                                                checked={draft.depositos.has(dep.id)}
                                                onChange={() => toggleDeposito(dep.id)}
                                            />
                                            <span className="font-mono text-xs text-app-mutedtext">{dep.codigo}</span>
                                            <span className="text-app-primary">{dep.nombre}</span>
                                            <span className="ml-auto truncate text-xs text-app-mutedtext">{dep.ubicacion}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-app-mutedtext">Vista y Administrador no llevan depósitos asignados.</p>
                        )}
                    </div>
                ) : null}
            </FormModal>

            <ConfirmDialog
                open={Boolean(confirmAccion)}
                title={confirmAccion?.tipo === "eliminar"
                    ? "Eliminar responsable"
                    : confirmAccion?.tipo === "ultimo-admin"
                        ? "No se puede desactivar"
                        : "Desactivar responsable"}
                description={!confirmAccion
                    ? ""
                    : confirmAccion.tipo === "eliminar"
                        ? `Si confirmás, se borra a ${confirmAccion.row.etiqueta} y se desvincula de los depósitos. No hay vuelta atrás.`
                        : confirmAccion.tipo === "ultimo-admin"
                            ? `No se puede dejar la plataforma sin un administrador activo.`
                            : `${confirmAccion.row.etiqueta} tiene movimientos en el historial, por eso no se puede eliminar. Si confirmás, queda inactivo y ya no puede ingresar. El historial se conserva.`}
                confirmLabel={confirmAccion?.tipo === "desactivar" ? "Desactivar" : "Eliminar"}
                cancelLabel={confirmAccion?.tipo === "ultimo-admin" ? "Entendido" : "Cancelar"}
                confirmVariant={confirmAccion?.tipo === "desactivar" ? "primary" : "danger"}
                showConfirm={confirmAccion?.tipo !== "ultimo-admin"}
                pending={saving}
                lockClose={saving}
                onConfirm={() => void handleConfirmAccion()}
                onClose={() => !saving && setConfirmAccion(null)}
            />
        </section>
    );
}
