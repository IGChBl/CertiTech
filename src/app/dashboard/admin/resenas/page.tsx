import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";

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

export default async function AdminResenasPage() {
  await requirePageRole("ADMIN");

  const reviews = await prisma.review.findMany({
    include: {
      client: {
        include: {
          clientProfile: true,
        },
      },
      technicianProfile: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <DashboardShell title="Gestion de resenas" subtitle="Monitorea reputacion y calidad del servicio." links={adminLinks}>
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{review.technicianProfile.displayName}</p>
              <RatingStars rating={review.rating} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{review.comment ?? "Sin comentario"}</p>
            <p className="mt-1 text-xs text-slate-500">
              Cliente: {review.client.clientProfile?.fullName ?? review.client.email}
            </p>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
