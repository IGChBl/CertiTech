import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { UserAvatar } from "@/components/ui/user-avatar";
import { technicianDashboardLinks } from "@/lib/dashboard-links";

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
    <DashboardShell
      title="Mis valoraciones"
      subtitle="Reputación construida con feedback real de clientes."
      links={[...technicianDashboardLinks]}
    >
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserAvatar
                  name={review.client.clientProfile?.fullName ?? review.client.email}
                  src={review.client.clientProfile?.avatarUrl}
                  size={34}
                />
                <p className="font-semibold text-slate-900">
                  {review.client.clientProfile?.fullName ?? review.client.email}
                </p>
              </div>
              <RatingStars rating={review.rating} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{review.comment ?? "Sin comentario"}</p>
          </Card>
        ))}
      </div>
      {!reviews.length ? <Card>No tienes valoraciones registradas aún.</Card> : null}
    </DashboardShell>
  );
}
