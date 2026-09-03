import { useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
export function FloatingPanel({ open, onClose, labelledBy, trigger, panelClassName, children, }) {
    const rootRef = useRef(null);
    useEffect(() => {
        if (!open)
            return;
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
    return (<div ref={rootRef} className="relative">
      {trigger}
      {open ? (<div className="absolute right-0 top-full z-50 pt-2">
          <div role="menu" aria-labelledby={labelledBy} className={cn("overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-modal", panelClassName)}>
            {children}
          </div>
        </div>) : null}
    </div>);
}
