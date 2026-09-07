import { useEffect, useMemo, useState } from "react";
import { Search, Warehouse } from "lucide-react";
import { FormModal } from "@/components/modals/form-modal";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InternalCode } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/app/layouts/ToastProvider";
import { actualizarMisDepositos, explainDepositoError, listDepositosParaAsignacion, listDepositosPropios, } from "@/services/depositos";

export function AdministrarDepositosModal({ open, onClose }) {
    const { notify } = useToast();
    const [todos, setTodos] = useState([]);
    const [selected, setSelected] = useState(() => new Set());
    const [iniciales, setIniciales] = useState(() => new Set());
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSearch("");
        Promise.all([listDepositosParaAsignacion(), listDepositosPropios()])
            .then(([activos, propios]) => {
            if (cancelled) return;
            setTodos(activos);
            const ids = new Set(propios.map((row) => row.id));
            setSelected(ids);
            setIniciales(ids);
        })
            .catch((err) => {
            if (!cancelled) setError(explainDepositoError(err));
        })
            .finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open]);

    const visibles = useMemo(() => {
        const term = search.trim().toLowerCase();
        const rows = term
            ? todos.filter((row) => `${row.codigo} ${row.nombre} ${row.ubicacion}`.toLowerCase().includes(term))
            : todos;
        return [...rows].sort((a, b) => {
            const aMine = selected.has(a.id) ? 0 : 1;
            const bMine = selected.has(b.id) ? 0 : 1;
            if (aMine !== bMine) return aMine - bMine;
            return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
        });
    }, [todos, search, selected]);

    function toggle(id) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleSave() {
        if (selected.size < 1) {
            setError("Tenés que quedar a cargo de al menos un depósito.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const result = await actualizarMisDepositos([...selected]);
            const added = Number(result.assigned ?? 0);
            const removed = Number(result.removed ?? 0);
            if (added === 0 && removed === 0) {
                notify("No cambiaste ningún depósito.", "success");
            }
            else {
                notify("Depósitos actualizados. El administrador ya ve la notificación.", "success");
            }
            onClose();
        }
        catch (err) {
            setError(explainDepositoError(err));
        }
        finally {
            setSaving(false);
        }
    }

    return (
        <FormModal
            open={open}
            title="Administrar depósitos"
            description="Se listan todos los depósitos activos. Arriba están los que ya tenés; marcá otro para asignártelo o destildá para dejarlo."
            onClose={() => !saving && onClose()}
            className="max-w-2xl"
            footer={<>
                <Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
                <Button disabled={saving || loading || selected.size < 1} onClick={() => void handleSave()}>
                    {saving ? <Spinner className="h-4 w-4 text-white" /> : <Warehouse size={16} strokeWidth={1.6} />}
                    {saving ? "Guardando…" : "Guardar depósitos"}
                </Button>
            </>}
        >
            {error ? <Alert>{error}</Alert> : null}
            <p className="text-xs text-app-mutedtext">
                {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
                {iniciales.size > 0 ? ` · ${iniciales.size} actuales` : ""}
            </p>
            <label className="relative block">
                <Search size={16} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-faint" />
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por código, nombre o ubicación"
                    className="w-full rounded-control border border-app-input bg-app-surface py-2 pl-9 pr-3 text-sm text-app-primary placeholder:text-app-faint focus:border-app-focus focus:ring-1 focus:ring-app-focus"
                />
            </label>
            <div className="max-h-72 overflow-auto rounded-xl border border-app-border-subtle">
                {loading ? (
                    <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-app-mutedtext">
                        <Spinner className="h-4 w-4" />
                        Cargando depósitos…
                    </p>
                ) : visibles.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-app-mutedtext">No hay depósitos activos.</p>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-app-muted text-app-mutedtext">
                            <tr>
                                <th className="w-10 px-3 py-2"><span className="sr-only">Seleccionar</span></th>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Nombre</th>
                                <th className="px-3 py-2">Ubicación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map((row) => (
                                <tr key={row.id} className="border-t border-app-border-subtle hover:bg-app-subtle">
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(row.id)}
                                            onChange={() => toggle(row.id)}
                                            className="h-4 w-4 accent-app-accent"
                                            aria-label={`Seleccionar ${row.nombre}`}
                                        />
                                    </td>
                                    <td className="px-3 py-2"><InternalCode>{row.codigo}</InternalCode></td>
                                    <td className="px-3 py-2 font-medium text-app-primary">
                                        {row.nombre}
                                        {iniciales.has(row.id) ? (
                                            <span className="ml-2 text-[11px] font-medium text-app-mutedtext">Ya asignado</span>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-app-secondarytext">{row.ubicacion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </FormModal>
    );
}
