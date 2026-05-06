import { prisma } from "@/lib/prisma";
import { TechnicianCard } from "@/components/cards/technician-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";

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

  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const technicians = await prisma.technicianProfile.findMany({
    where: {
      user: { status: "ACTIVE", isEmailVerified: true },
      verification: "VERIFIED",
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
    include: {
      services: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 md:px-6">
      <SectionTitle
        title="Directorio de tecnicos"
        subtitle="Filtra por categoria, ubicacion y nivel de confianza para contratar mejor."
      />

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
            <option value="">Todas las categorias</option>
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
              categories: technician.services.map((service) => service.category.name),
            }}
          />
        ))}
      </div>

      {!technicians.length ? (
        <Card>
          <p className="text-sm text-slate-600">No encontramos tecnicos con los filtros seleccionados.</p>
        </Card>
      ) : null}
    </div>
  );
}
