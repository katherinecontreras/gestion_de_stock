import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type TableShellProps = {
  toolbar?: ReactNode;
  children?: ReactNode;
  empty?: string;
  className?: string;
};

export function TableShell({
  toolbar,
  children,
  empty,
  className,
}: TableShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-table border border-app-border bg-app-surface shadow-table",
        className,
      )}
    >
      {toolbar ? (
        <div className="border-b border-app-border-subtle bg-app-muted p-3">
          {toolbar}
        </div>
      ) : null}
      {children ? (
        <div className="min-w-[40rem] overflow-x-auto">{children}</div>
      ) : null}
      {empty ? (
        <p className="px-4 py-8 text-center text-sm text-app-mutedtext">{empty}</p>
      ) : null}
    </div>
  );
}
