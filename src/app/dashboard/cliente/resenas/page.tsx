import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuracion" },
];

export default async function ClienteResenasPage() {
  const user = await requirePageRole("CLIENT");

  const reviews = await prisma.review.findMany({
    where: { clientId: user.id },
    include: {
      technicianProfile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Mis resenas" subtitle="Historial de valoraciones realizadas." links={clientLinks}>
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{review.technicianProfile.displayName}</p>
              <RatingStars rating={review.rating} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{review.comment ?? "Sin comentario"}</p>
          </Card>
        ))}
      </div>
      {!reviews.length ? <Card>Aun no has realizado valoraciones.</Card> : null}
    </DashboardShell>
  );
}
