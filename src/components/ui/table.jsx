import { motion } from "motion/react";
import { cn } from "@/utils/cn";
import { easeOut } from "@/utils/motion";

export function TableShell({ toolbar, children, empty, className }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: easeOut }}
            className={cn("max-w-full overflow-hidden rounded-table border border-app-border bg-app-surface shadow-table", className)}
        >
            {toolbar ? <div className="border-b border-app-border-subtle bg-app-muted p-3">{toolbar}</div> : null}
            {children ? <div className="overflow-x-auto overscroll-x-contain">{children}</div> : null}
            {empty ? <p className="px-4 py-8 text-center text-sm text-app-mutedtext">{empty}</p> : null}
        </motion.div>
    );
}
const GHOST_WIDTHS = ["4.5rem", "11rem", "5.5rem", "6.5rem", "7rem", "5rem"];
export function TableGhost({ columns, rows = 8, minWidth = "40rem", }) {
    return (<table className="w-full text-left text-sm" style={{ minWidth }}>
      <thead className="bg-app-muted text-app-mutedtext">
        <tr>
          {columns.map((column) => (<th key={column.label} className={cn("px-4 py-3 font-semibold", column.align === "right" && "text-right")}>
              {column.label}
            </th>))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, row) => (<tr key={row} className="border-t border-app-border-subtle">
            {columns.map((column, col) => (<td key={column.label} className="px-4 py-3">
                <span className={cn("table-ghost-bar", column.align === "right" && "ml-auto")} style={{
                    width: GHOST_WIDTHS[(row + col) % GHOST_WIDTHS.length],
                }}/>
              </td>))}
          </tr>))}
      </tbody>
    </table>);
}
export function TableAppearRow({ index, className, children, ...props }) {
    return (
        <motion.tr
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.32,
                delay: Math.min(index, 14) * 0.035,
                ease: easeOut,
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.tr>
    );
}
