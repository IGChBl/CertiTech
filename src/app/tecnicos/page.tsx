import { prisma } from "@/lib/prisma";
import { TechnicianCard } from "@/components/cards/technician-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { buildPublicTechnicianWhere } from "@/lib/subscriptions/service";

type SearchParamValue = string | string[] | undefined;

type SearchParams = {
  q?: SearchParamValue;
  city?: SearchParamValue;
  category?: SearchParamValue;
};

function toStringValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function TecnicosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const query = toStringValue(params.q);
  const city = toStringValue(params.city);
  const category = toStringValue(params.category);

  const categoriesPromise = prisma.serviceCategory
    .findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    })
    .then((data) => ({ categories: data, hasWarning: false }))
    .catch((error) => {
      console.error("[public][tecnicos] Error cargando categorías", error);
      return { categories: [], hasWarning: true };
    });

  const techniciansPromise = prisma.technicianProfile
    .findMany({
      where: {
        ...buildPublicTechnicianWhere(),
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: "insensitive" } },
                { businessName: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(category
          ? {
              services: {
                some: {
                  OR: [{ category: { slug: category } }, { categoryId: category }],
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        businessName: true,
        city: true,
        workZone: true,
        description: true,
        averageRating: true,
        totalReviews: true,
        verification: true,
        referencePriceMin: true,
        avatarUrl: true,
        subscriptionPlan: true,
        services: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { featuredUntil: "desc" },
        { subscriptionPlan: "desc" },
        { averageRating: "desc" },
        { totalReviews: "desc" },
      ],
    })
    .then((data) => ({ technicians: data, hasWarning: false }))
    .catch((error) => {
      console.error("[public][tecnicos] Error cargando técnicos", error);
      return { technicians: [], hasWarning: true };
    });

  const [categoriesResult, techniciansResult] = await Promise.all([
    categoriesPromise,
    techniciansPromise,
  ]);

  const categories = categoriesResult.categories;
  const technicians = techniciansResult.technicians;
  const hasWarning = categoriesResult.hasWarning || techniciansResult.hasWarning;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 md:px-6">
      <SectionTitle
        title="Directorio de técnicos"
        subtitle="Filtra por categoría, ubicación y nivel de confianza para contratar mejor."
      />

      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <Card>
        <form className="grid gap-3 md:grid-cols-4" action="/tecnicos" method="get">
          <input
            name="q"
            placeholder="Nombre o servicio"
            defaultValue={query}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            name="city"
            placeholder="Ciudad"
            defaultValue={city}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <select
            name="category"
            defaultValue={category}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Aplicar</button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {technicians.map((technician) => (
          <TechnicianCard
            key={technician.id}
            technician={{
              id: technician.id,
              displayName: technician.displayName,
              businessName: technician.businessName,
              city: technician.city,
              workZone: technician.workZone,
              description: technician.description,
              averageRating: technician.averageRating,
              totalReviews: technician.totalReviews,
              verification: technician.verification,
              referencePriceMin: technician.referencePriceMin,
              avatarUrl: technician.avatarUrl,
              subscriptionPlan: technician.subscriptionPlan,
              categories: technician.services.map((service) => service.category.name),
            }}
          />
        ))}
      </div>

      {!technicians.length ? (
        <Card>
          <p className="text-sm text-slate-600">No encontramos técnicos con los filtros seleccionados.</p>
        </Card>
      ) : null}
    </div>
  );
}
