import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

const adminLinks = [
  { href: "/dashboard/admin", label: "Resumen" },
  { href: "/dashboard/admin/usuarios", label: "Usuarios" },
  { href: "/dashboard/admin/tecnicos", label: "Tecnicos" },
  { href: "/dashboard/admin/categorias", label: "Categorias" },
  { href: "/dashboard/admin/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/admin/reportes", label: "Reportes" },
  { href: "/dashboard/admin/resenas", label: "Resenas" },
  { href: "/dashboard/admin/moderacion", label: "Moderacion" },
];

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
    <DashboardShell title="Gestion de categorias" subtitle="Controla la taxonomia de servicios de la plataforma." links={adminLinks}>
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
