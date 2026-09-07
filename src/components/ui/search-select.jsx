import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

export function SearchSelect({
    label,
    value,
    options,
    onChange,
    placeholder = "Escribí para buscar…",
    emptyOption,
    disabled = false,
    className,
}) {
    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlight, setHighlight] = useState(0);
    const [coords, setCoords] = useState(null);

    const selected = options.find((option) => option.value === value) ?? null;
    const empty = emptyOption ? { value: "", label: emptyOption } : null;

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        const list = empty ? [empty, ...options] : options;
        if (!term || term === (selected?.label ?? "").toLowerCase()) return list;
        return list.filter((option) => option.label.toLowerCase().includes(term));
    }, [empty, options, query, selected?.label]);

    useLayoutEffect(() => {
        if (!open) {
            setCoords(null);
            return;
        }
        function place() {
            const el = inputRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 12 * 16),
            });
        }
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [open, query, filtered.length]);

    useEffect(() => {
        if (!open) return;
        function onPointer(event) {
            const target = event.target;
            if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
            setOpen(false);
            setQuery("");
        }
        document.addEventListener("mousedown", onPointer);
        return () => document.removeEventListener("mousedown", onPointer);
    }, [open]);

    useEffect(() => {
        setHighlight(0);
    }, [query, open]);

    function pick(next) {
        onChange(next);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
    }

    function onKeyDown(event) {
        if (disabled) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            setHighlight((current) => Math.min(filtered.length - 1, current + 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((current) => Math.max(0, current - 1));
        } else if (event.key === "Enter") {
            event.preventDefault();
            const option = filtered[highlight];
            if (option) pick(option.value);
        } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
        }
    }

    const shown = open ? query : (selected?.label ?? "");

    return (
        <label ref={rootRef} className={cn("relative flex min-w-[12rem] flex-col gap-1.5", className)}>
            {label ? <span className="text-sm font-medium text-app-secondarytext">{label}</span> : null}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    disabled={disabled}
                    role="combobox"
                    aria-expanded={open}
                    aria-autocomplete="list"
                    value={shown}
                    placeholder={emptyOption || placeholder}
                    onFocus={(event) => {
                        if (disabled) return;
                        setOpen(true);
                        setQuery(selected?.label ?? "");
                        event.target.select();
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    className={cn(
                        "w-full rounded-control border border-app-input bg-app-surface py-2 pl-3 pr-9 text-sm text-app-primary placeholder:text-app-faint",
                        "focus:border-app-focus focus:ring-1 focus:ring-app-focus",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                />
                <ChevronDown
                    size={16}
                    strokeWidth={1.7}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-app-faint"
                />
                {open && !disabled && coords
                    ? createPortal(
                        <ul
                            ref={listRef}
                            role="listbox"
                            style={{ top: coords.top, left: coords.left, width: coords.width }}
                            className="fixed z-[80] max-h-56 overflow-auto rounded-control border border-app-border bg-app-surface py-1 shadow-modal"
                        >
                            {filtered.length === 0 ? (
                                <li className="px-3 py-2 text-sm text-app-mutedtext">No hay coincidencias.</li>
                            ) : (
                                filtered.map((option, index) => {
                                    const active = option.value === value;
                                    return (
                                        <li key={`${option.value || "empty"}-${option.label}`}>
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={active}
                                                onMouseEnter={() => setHighlight(index)}
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => pick(option.value)}
                                                className={cn(
                                                    "flex w-full px-3 py-2 text-left text-sm",
                                                    index === highlight ? "bg-app-subtle text-app-primary" : "text-app-secondarytext",
                                                    active && "font-medium text-app-primary",
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        </li>
                                    );
                                })
                            )}
                        </ul>,
                        document.body,
                    )
                    : null}
            </div>
        </label>
    );
}
