import { cn } from "@/utils/cn";
const variants = {
    primary: "bg-app-accent text-app-accent-fg hover:bg-app-accent-hover px-4 py-[10px] font-medium",
    secondary: "bg-transparent text-app-secondarytext border border-app-input hover:bg-app-subtle px-4 py-[10px] font-medium",
    danger: "bg-app-danger text-white hover:bg-app-danger-hover px-4 py-[10px] font-medium",
    ghost: "bg-transparent text-app-mutedtext hover:bg-app-subtle p-2",
    link: "bg-transparent text-app-mutedtext underline hover:text-app-primary px-0 py-0 font-medium",
    table: "bg-transparent text-app-mutedtext hover:bg-app-subtle p-2",
    logout: "bg-transparent text-app-secondarytext border border-app-input hover:bg-app-subtle px-3 py-1.5 font-medium",
};
export function Button({ variant = "primary", className = "", children, type = "button", ...props }) {
    return (<button type={type} className={cn("inline-flex items-center justify-center gap-2 rounded-control text-sm transition-colors duration-hover disabled:cursor-not-allowed disabled:opacity-60", variants[variant], className)} {...props}>
      {children}
    </button>);
}
