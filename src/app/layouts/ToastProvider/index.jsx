import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useState, } from "react";
const ToastContext = createContext(null);
const VARIANT_STYLES = {
    success: "border-[#a7f3d0] bg-app-success-bg text-app-success",
    error: "border-[#fecaca] bg-app-danger-bg text-app-danger-text",
    info: "border-app-border bg-app-surface text-app-secondarytext",
};
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);
    const notify = useCallback((message, variant = "info") => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((current) => [...current, { id, message, variant }]);
        window.setTimeout(() => dismiss(id), 4000);
    }, [dismiss]);
    const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);
    return (<ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((toast) => (<motion.div key={toast.id} initial={{ opacity: 0, scale: 0.94, y: -14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -8 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} className={`origin-top pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-center text-sm shadow-toast ${VARIANT_STYLES[toast.variant]}`} role="status">
              {toast.message}
            </motion.div>))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>);
}
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast debe usarse dentro de ToastProvider");
    }
    return context;
}
