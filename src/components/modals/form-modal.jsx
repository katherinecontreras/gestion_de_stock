import { cn } from "@/utils/cn";
export function FormModal({ open, title, description, onClose, children, footer, className, }) {
    if (!open)
        return null;
    return (<div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-app-overlay" onClick={onClose}/>
      <div role="dialog" aria-modal="true" aria-labelledby="form-modal-title" className={cn("relative z-10 w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-modal", className ?? "max-w-md")}>
        <h2 id="form-modal-title" className="text-lg font-semibold text-app-primary">
          {title}
        </h2>
        {description ? (<p className="mt-1 text-sm text-app-mutedtext">{description}</p>) : null}
        <div className="mt-4 space-y-3">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>);
}
