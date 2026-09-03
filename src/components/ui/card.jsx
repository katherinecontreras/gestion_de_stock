import { cn } from "@/utils/cn";
export function Card({ title, className, children, ...props }) {
    return (<section className={cn("rounded-card border border-app-border bg-app-surface p-4 shadow-card sm:p-5", className)} {...props}>
      {title ? (<h2 className="mb-3 text-sm font-semibold text-app-primary">{title}</h2>) : null}
      {children}
    </section>);
}
