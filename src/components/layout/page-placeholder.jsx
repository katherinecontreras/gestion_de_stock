import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table";
export function PagePlaceholder({ title, description, actions, }) {
    return (<section>
      <PageHeader title={title} description={description ??
            "Módulo listo para implementar en la siguiente fase. La ruta, el layout y el tipado de datos ya están conectados."} actions={actions}/>
      <TableShell empty="Todavía no hay registros para mostrar."/>
    </section>);
}
