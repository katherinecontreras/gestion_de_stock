import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

export function Brand({
  compact = false,
  stacked = false,
  title = "Gestión de Stock",
  className,
  to,
}) {
  const classes = cn(
    "flex min-w-0 items-center gap-2.5",
    stacked && "flex-col justify-center gap-1.5 text-center",
    to && "rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-app-secondary/40",
    className,
  );

  const content = (
    <>
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
    </>
  );

  if (to) {
    return (
      <Link to={to} aria-label={`${title} — ir al dashboard`} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
