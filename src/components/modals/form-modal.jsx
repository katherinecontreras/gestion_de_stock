import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/utils/cn";
import { overlayTransition, springSoft } from "@/utils/motion";

export function FormModal({ open, title, description, onClose, children, footer, className }) {
    return (
        <AnimatePresence>
            {open ? (
                <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-4">
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
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="form-modal-title"
                        initial={{ opacity: 0, y: 28, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={springSoft}
                        className={cn(
                            "relative z-10 flex max-h-[min(92dvh,44rem)] w-full flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface p-4 shadow-modal sm:p-5",
                            className ?? "max-w-md",
                        )}
                    >
                        <h2 id="form-modal-title" className="text-lg font-semibold text-app-primary">
                            {title}
                        </h2>
                        {description ? <p className="mt-1 text-sm text-app-mutedtext">{description}</p> : null}
                        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">{children}</div>
                        {footer ? (
                            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
                        ) : null}
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
