import { FileSpreadsheet, Plus } from "lucide-react";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Button } from "@/components/ui/button";

export default function ArticulosPage() {
  return (
    <PagePlaceholder
      title="Artículos"
      description="Catálogo con búsqueda, filtros por familia/grupo, carga individual y masiva, y descarga a Excel."
      actions={
        <>
          <Button variant="secondary" className="w-full lg:w-auto" disabled>
            <FileSpreadsheet size={18} strokeWidth={1.6} />
            Carga masiva
          </Button>
          <Button className="w-full lg:w-auto" disabled>
            <Plus size={18} strokeWidth={1.6} />
            Cargar artículo
          </Button>
        </>
      }
    />
  );
}
