import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default async function AdminTecnicosPage() {
  await requirePageRole("ADMIN");

  const technicians = await prisma.technicianProfile.findMany({
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Gestion de tecnicos" subtitle="Verificacion, reputacion y estado operativo." links={adminLinks}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {technicians.map((tech) => (
          <Card key={tech.id}>
            <h3 className="text-lg font-semibold text-slate-900">{tech.displayName}</h3>
            <p className="text-sm text-slate-600">{tech.businessName ?? tech.user.email}</p>
            <p className="text-sm text-slate-500">{tech.city}</p>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant={tech.verification === "VERIFIED" ? "success" : "warning"}>{tech.verification}</Badge>
              <p className="text-xs text-slate-500">{tech.averageRating.toFixed(1)} estrellas</p>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
