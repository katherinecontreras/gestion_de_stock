import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "error" | "success";
  children: ReactNode;
};

export function Alert({
  tone = "error",
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-control px-3 py-2 text-sm",
        tone === "error"
          ? "bg-app-danger-bg text-app-danger-text"
          : "bg-app-success-bg text-app-success",
        className,
      )}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
}
