import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoValoracionesPage() {
  const user = await requirePageRole("TECHNICIAN");

  const reviews = await prisma.review.findMany({
    where: {
      technicianProfileId: user.technicianProfile?.id,
    },
    include: {
      client: {
        include: {
          clientProfile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Mis valoraciones" subtitle="Reputacion construida con feedback real de clientes." links={technicianLinks}>
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">
                {review.client.clientProfile?.fullName ?? review.client.email}
              </p>
              <RatingStars rating={review.rating} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{review.comment ?? "Sin comentario"}</p>
          </Card>
        ))}
      </div>
      {!reviews.length ? <Card>No tienes valoraciones registradas aun.</Card> : null}
    </DashboardShell>
  );
}
