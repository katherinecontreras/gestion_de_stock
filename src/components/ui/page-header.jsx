import { motion } from "motion/react";
import { easeOut } from "@/utils/motion";

export function PageHeader({ title, description, actions }) {
    return (
        <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
            <div className="min-w-0">
                <h1 className="text-xl font-bold text-app-primary sm:text-2xl">{title}</h1>
                {description ? <p className="mt-1 max-w-3xl text-sm text-app-mutedtext">{description}</p> : null}
            </div>
            {actions ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08, duration: 0.28, ease: easeOut }}
                    className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:[&>*]:w-auto lg:w-auto lg:justify-end [&>*]:w-full"
                >
                    {actions}
                </motion.div>
            ) : null}
        </motion.header>
    );
}
