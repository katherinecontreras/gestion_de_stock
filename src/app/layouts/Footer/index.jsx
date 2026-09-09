export function Footer() {
    const year = new Date().getFullYear();
    return (<footer className="flex shrink-0 flex-col items-center justify-between gap-1 border-t border-app-border bg-app-surface px-3 py-2.5 text-center text-xs text-app-mutedtext sm:flex-row sm:px-4 sm:py-3 sm:text-left sm:text-sm">
      <p>© {year} Simetra Service SA. Todos los derechos reservados.</p>
      <p>Diseñado para el equipo interno de Simetra.</p>
    </footer>);
}
