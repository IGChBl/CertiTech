import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";

export default async function CategoriasPage() {
  const { categories, hasWarning } = await (async () => {
    try {
      const data = await prisma.serviceCategory.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              technicianServices: true,
              serviceRequests: true,
            },
          },
        },
      });

      return { categories: data, hasWarning: false };
    } catch (error) {
      console.error("[public][categorias] Error cargando categorías", error);
      return { categories: [], hasWarning: true };
    }
  })();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 md:px-6">
      <SectionTitle title="Categorías de servicios" subtitle="Explora especialidades disponibles en la plataforma." />

      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/tecnicos?category=${category.slug}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-slate-900">{category.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{category.description ?? "Servicios técnicos profesionales"}</p>
            <p className="mt-3 text-xs text-slate-500">
              {category._count.technicianServices} técnicos | {category._count.serviceRequests} solicitudes
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
