import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoDashboardPage() {
  const user = await requirePageRole("TECHNICIAN");

  const [assigned, completed, reviews, pendingRequests] = await Promise.all([
    prisma.serviceRequest.count({ where: { technicianId: user.id } }),
    prisma.serviceRequest.count({ where: { technicianId: user.id, status: "COMPLETED" } }),
    prisma.review.count({
      where: {
        technicianProfileId: user.technicianProfile?.id,
      },
    }),
    prisma.serviceRequest.count({
      where: {
        technicianId: null,
        status: "PENDING",
        categoryId: {
          in: user.technicianProfile
            ? (
                await prisma.technicianService.findMany({
                  where: { technicianId: user.technicianProfile.id },
                  select: { categoryId: true },
                })
              ).map((service) => service.categoryId)
            : [],
        },
      },
    }),
  ]);

  return (
    <DashboardShell
      title={`Panel tecnico: ${user.technicianProfile?.displayName ?? user.email}`}
      subtitle="Gestiona solicitudes, conversaciones y reputacion desde un solo lugar."
      links={technicianLinks}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Solicitudes asignadas", value: assigned },
          { label: "Trabajos completados", value: completed },
          { label: "Valoraciones", value: reviews },
          { label: "Solicitudes disponibles", value: pendingRequests },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
