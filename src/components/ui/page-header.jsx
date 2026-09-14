import { motion } from "motion/react";
import { easeOut } from "@/utils/motion";

export function PageHeader({ title, description, actions }) {
    return (
        <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="mb-6"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <h1 className="min-w-0 text-xl font-bold text-app-primary sm:text-2xl">{title}</h1>
                {actions ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08, duration: 0.28, ease: easeOut }}
                        className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto"
                    >
                        {actions}
                    </motion.div>
                ) : null}
            </div>
            {description ? <p className="mt-1 max-w-3xl text-sm text-app-mutedtext">{description}</p> : null}
        </motion.header>
    );
}
