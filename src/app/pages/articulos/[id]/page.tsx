import { PagePlaceholder } from "@/components/layout/page-placeholder";

type ArticuloHistorialPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArticuloHistorialPage({
  params,
}: ArticuloHistorialPageProps) {
  const { id } = await params;

  return (
    <PagePlaceholder
      title="Historial del artículo"
      description={`Línea de tiempo de movimientos y costos para el artículo ${id}.`}
    />
  );
}
