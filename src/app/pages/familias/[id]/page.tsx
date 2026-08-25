import { PagePlaceholder } from "@/components/layout/page-placeholder";

type FamiliaDetallePageProps = {
  params: Promise<{ id: string }>;
};

export default async function FamiliaDetallePage({
  params,
}: FamiliaDetallePageProps) {
  const { id } = await params;

  return (
    <PagePlaceholder
      title="Gestionar grupos y artículos"
      description={`Detalle de la familia ${id}: grupos, costos y asignación de artículos.`}
    />
  );
}
