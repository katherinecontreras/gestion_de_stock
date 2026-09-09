import { motion } from "motion/react";
import { cn } from "@/utils/cn";
import { easeOut } from "@/utils/motion";

export function Card({ title, className, children, ...props }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: easeOut }}
            className={cn("rounded-card border border-app-border bg-app-surface p-4 shadow-card sm:p-5", className)}
            {...props}
        >
            {title ? <h2 className="mb-3 text-sm font-semibold text-app-primary">{title}</h2> : null}
            {children}
        </motion.section>
    );
}
