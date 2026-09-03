import { cn } from "@/utils/cn";
export function Spinner({ className, ...props }) {
    return (<svg viewBox="0 0 24 24" fill="none" className={cn("spinner h-5 w-5 text-app-primary", className)} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" className="opacity-25"/>
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>);
}
