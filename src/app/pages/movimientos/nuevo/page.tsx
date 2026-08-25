import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function NuevoMovimientoPage() {
  return (
    <PagePlaceholder
      title="Nuevo movimiento"
      description="Asistente de 4 pasos. La persistencia se hará con rpc_crear_movimiento para garantizar atomicidad."
    />
  );
}
