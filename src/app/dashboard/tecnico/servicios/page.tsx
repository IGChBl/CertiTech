import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { TechnicianServicesManager } from "@/components/dashboard/technician-services-manager";
import { technicianDashboardLinks } from "@/lib/dashboard-links";

export default async function TecnicoServiciosPage() {
  const user = await requirePageRole("TECHNICIAN");

  if (!user.technicianProfile) {
    return (
      <DashboardShell
        title="Servicios y Precios"
        subtitle="Administra los servicios que ofreces y sus tarifas base."
        links={[...technicianDashboardLinks]}
      >
        <Card>
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            No se pudo encontrar tu perfil de técnico. Contacta al soporte técnico.
          </p>
        </Card>
      </DashboardShell>
    );
  }

  const profileId = user.technicianProfile.id;

  const servicesResult = await prisma.technicianService
    .findMany({
      where: { technicianId: profileId },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    })
    .then((data) => ({ services: data, hasWarning: false }))
    .catch((error) => {
      console.error("[dashboard][tecnico][servicios] Error cargando servicios", error);
      return { services: [], hasWarning: true };
    });

  const categoriesResult = await prisma.serviceCategory
    .findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })
    .then((data) => ({ categories: data, hasWarning: false }))
    .catch((error) => {
      console.error("[dashboard][tecnico][servicios] Error cargando categorías", error);
      return { categories: [], hasWarning: true };
    });

  const hasWarning = servicesResult.hasWarning || categoriesResult.hasWarning;

  return (
    <DashboardShell
      title="Servicios y Precios"
      subtitle="Administra los servicios que ofreces y sus tarifas base para que los clientes puedan agendarte."
      links={[...technicianDashboardLinks]}
    >
      {hasWarning ? (
        <Card className="mb-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <Card>
        <TechnicianServicesManager
          initialServices={servicesResult.services.map((item) => ({
            id: item.id,
            categoryId: item.categoryId,
            title: item.title,
            description: item.description,
            basePrice: item.basePrice,
            isActive: item.isActive,
            category: {
              id: item.category.id,
              name: item.category.name,
            },
          }))}
          categories={categoriesResult.categories}
        />
      </Card>
    </DashboardShell>
  );
}
