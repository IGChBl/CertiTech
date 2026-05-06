import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";

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
    <DashboardShell
      title="Gestion de resenas"
      subtitle="Monitorea reputacion y calidad del servicio."
      links={[...adminDashboardLinks]}
    >
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
