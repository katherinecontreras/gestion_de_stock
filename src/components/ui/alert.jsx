import { motion } from "motion/react";
import { cn } from "@/utils/cn";
import { springSnappy } from "@/utils/motion";

export function Alert({ tone = "error", className, children, ...props }) {
    return (
        <motion.div
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSnappy}
            className={cn(
                "rounded-control px-3 py-2 text-sm",
                tone === "error" ? "bg-app-danger-bg text-app-danger-text" : "bg-app-success-bg text-app-success",
                className,
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
