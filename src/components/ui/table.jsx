import { motion } from "motion/react";
import { cn } from "@/utils/cn";
export function TableShell({ toolbar, children, empty, className, }) {
    return (<div className={cn("overflow-hidden rounded-table border border-app-border bg-app-surface shadow-table", className)}>
      {toolbar ? (<div className="border-b border-app-border-subtle bg-app-muted p-3">
          {toolbar}
        </div>) : null}
      {children ? (<div className="min-w-[40rem] overflow-x-auto">{children}</div>) : null}
      {empty ? (<p className="px-4 py-8 text-center text-sm text-app-mutedtext">{empty}</p>) : null}
    </div>);
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
    return (<motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{
            duration: 0.28,
            delay: Math.min(index, 18) * 0.045,
            ease: [0.22, 1, 0.36, 1],
        }} className={className} {...props}>
      {children}
    </motion.tr>);
}
