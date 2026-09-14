import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Brand } from "@/components/layout/brand";
import { cn } from "@/utils/cn";

export function AuthCard({ title, description, children, className, wide = false }) {
    const hasMaxWidth = /\bmax-w-/.test(className ?? "");
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "h-fit w-full shrink-0 self-center rounded-2xl border border-app-border bg-app-surface px-5 py-5 shadow-card sm:px-7 sm:py-6",
                !hasMaxWidth && (wide ? "max-w-lg md:max-w-4xl md:px-8 md:py-7" : "max-w-md"),
                className,
            )}
        >
            <div className="mb-4">
                <Brand stacked className="mb-0" />
            </div>
            <div className="mb-4 text-center">
                <h1 className="text-lg font-bold text-app-primary">{title}</h1>
                <p className="mt-1 text-[13px] leading-5 text-app-mutedtext">
                    {description}
                </p>
            </div>
            {children}
        </motion.div>
    );
}

export function AuthDivider() {
    return <div className="border-t border-app-border" role="separator" />;
}

export function AuthPrompt({ question, to, action }) {
    return (
        <p className="text-center text-[13px] leading-5 text-app-mutedtext">
            {question}{" "}
            <Link
                className="font-semibold text-app-primary underline-offset-2 transition-colors duration-hover hover:underline"
                to={to}
            >
                {action}
            </Link>
        </p>
    );
}
