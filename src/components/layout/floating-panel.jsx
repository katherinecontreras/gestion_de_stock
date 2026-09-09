import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/utils/cn";
import { springSnappy } from "@/utils/motion";

export function FloatingPanel({ open, onClose, labelledBy, trigger, panelClassName, children }) {
    const rootRef = useRef(null);
    useEffect(() => {
        if (!open) return;
        function handlePointer(event) {
            if (!rootRef.current?.contains(event.target)) {
                onClose();
            }
        }
        function handleKey(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        document.addEventListener("mousedown", handlePointer);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handlePointer);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open, onClose]);
    return (
        <div ref={rootRef} className="relative">
            {trigger}
            <AnimatePresence>
                {open ? (
                    <motion.div
                        className="absolute right-0 top-full z-50 max-w-[calc(100vw-1.25rem)] pt-2"
                        initial={{ opacity: 0, y: -10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={springSnappy}
                    >
                        <div
                            role="menu"
                            aria-labelledby={labelledBy}
                            className={cn(
                                "max-w-full overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-modal",
                                panelClassName,
                            )}
                        >
                            {children}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
