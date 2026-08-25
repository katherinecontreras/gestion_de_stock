import { PagePlaceholder } from "@/components/layout/page-placeholder";

type MovimientoDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default async function MovimientoDetallePage({
  params,
}: MovimientoDetallePageProps) {
  const { id } = await params;

  return (
    <PagePlaceholder
      title="Detalle de movimiento"
      description={`Cabecera y artículos del movimiento ${id}.`}
    />
  );
}
