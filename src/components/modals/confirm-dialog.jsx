import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { overlayTransition, springSoft } from "@/utils/motion";

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Eliminar",
    cancelLabel = "Cancelar",
    confirmVariant = "danger",
    showConfirm = true,
    pending = false,
    lockClose = false,
    onConfirm,
    onClose,
}) {
    return (
        <AnimatePresence>
            {open ? (
                <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-4">
                    <motion.button
                        type="button"
                        aria-label="Cerrar"
                        className="absolute inset-0 bg-app-overlay"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={overlayTransition}
                    />
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirm-dialog-title"
                        initial={{ opacity: 0, y: 24, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={springSoft}
                        className="relative z-10 w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-4 shadow-modal sm:p-5"
                    >
                        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-app-primary">
                            {title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-app-mutedtext">{description}</p>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="secondary" onClick={onClose} disabled={lockClose}>
                                {cancelLabel}
                            </Button>
                            {showConfirm ? (
                                <Button variant={confirmVariant} onClick={onConfirm} disabled={pending}>
                                    {pending ? <Spinner className="h-4 w-4 text-current" /> : null}
                                    {confirmLabel}
                                </Button>
                            ) : null}
                        </div>
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
