import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table";

type PagePlaceholderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PagePlaceholder({
  title,
  description,
  actions,
}: PagePlaceholderProps) {
  return (
    <section>
      <PageHeader
        title={title}
        description={
          description ??
          "Módulo listo para implementar en la siguiente fase. La ruta, el layout y el tipado de datos ya están conectados."
        }
        actions={actions}
      />
      <TableShell empty="Todavía no hay registros para mostrar." />
    </section>
  );
}
