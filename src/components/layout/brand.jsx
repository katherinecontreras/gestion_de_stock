import { cn } from "@/utils/cn";

export function Brand({
  compact = false,
  stacked = false,
  title = "Gestión de Stock",
  className,
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        stacked && "flex-col justify-center gap-1.5 text-center",
        className,
      )}
    >
      <img
        src="/logo.png"
        alt="Simetra"
        width={36}
        height={36}
        className={cn(
          "h-8 w-8 shrink-0 object-contain",
          stacked && "h-10 w-10 sm:h-12 sm:w-12",
        )}
      />
      {compact ? null : (
        <span
          className={cn(
            "truncate font-semibold text-app-primary",
            stacked ? "text-sm sm:text-base" : "text-base font-bold",
          )}
        >
          {title}
        </span>
      )}
    </div>
  );
}
