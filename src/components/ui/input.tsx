import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: ReactNode;
};

export function Input({
  label,
  hint,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      {label ? (
        <span className="text-sm font-medium text-app-secondarytext">
          {label}
        </span>
      ) : null}
      <input
        id={id}
        className={cn(
          "w-full rounded-control border border-app-input bg-app-surface px-3 py-2 text-sm text-app-primary placeholder:text-app-faint",
          "transition-colors duration-hover",
          "focus:border-app-focus focus:ring-1 focus:ring-app-focus",
          className,
        )}
        {...props}
      />
      {hint}
    </label>
  );
}
