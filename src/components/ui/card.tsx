import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
};

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-card border border-app-border bg-app-surface p-4 shadow-card sm:p-5",
        className,
      )}
      {...props}
    >
      {title ? (
        <h2 className="mb-3 text-sm font-semibold text-app-primary">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
