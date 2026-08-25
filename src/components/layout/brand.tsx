import Image from "next/image";
import { cn } from "@/utils/cn";

type BrandProps = {
  compact?: boolean;
  stacked?: boolean;
  title?: string;
  className?: string;
};

export function Brand({
  compact = false,
  stacked = false,
  title = "Gestión de Stock",
  className,
}: BrandProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        stacked && "flex-col justify-center gap-1.5 text-center",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="Simetra"
        width={36}
        height={36}
        className={cn(
          "h-8 w-8 shrink-0 object-contain",
          stacked && "h-10 w-10",
        )}
        priority
      />
      {compact ? null : (
        <span
          className={cn(
            "truncate font-semibold text-app-primary",
            stacked ? "text-sm" : "text-base font-bold",
          )}
        >
          {title}
        </span>
      )}
    </div>
  );
}
