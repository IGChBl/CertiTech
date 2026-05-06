import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

export default async function AdminCategoriasPage() {
  await requirePageRole("ADMIN");

  const categories = await prisma.serviceCategory.findMany({
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

  return (
    <DashboardShell
      title="Gestion de categorias"
      subtitle="Controla la taxonomia de servicios de la plataforma."
      links={[...adminDashboardLinks]}
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <p className="font-semibold text-slate-900">{category.name}</p>
            <p className="text-sm text-slate-500">Slug: {category.slug}</p>
            <p className="mt-2 text-xs text-slate-500">
              Tecnicos: {category._count.technicianServices} | Solicitudes: {category._count.serviceRequests}
            </p>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
