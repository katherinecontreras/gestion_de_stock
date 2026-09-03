import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
export function ConfirmDialog({ open, title, description, confirmLabel = "Eliminar", pending = false, onConfirm, onClose, }) {
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-app-overlay" onClick={onClose}/>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="relative z-10 w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-modal">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-app-primary">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-app-mutedtext">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? <Spinner className="h-4 w-4 text-white"/> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>);
}
