import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { UserAvatar } from "@/components/ui/user-avatar";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import { Star } from "lucide-react";

export default async function TecnicoValoracionesPage() {
  const user = await requirePageRole("TECHNICIAN");

  const reviews = await prisma.review.findMany({
    where: { technicianProfileId: user.technicianProfile?.id },
    include: {
      client: {
        include: {
          clientProfile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <DashboardShell
      title="Mis valoraciones"
      subtitle="Reputación construida con feedback real de clientes."
      links={[...technicianDashboardLinks]}
    >
      {/* Stats header */}
      {total > 0 && (
        <Card className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Average */}
          <div className="flex flex-col items-center gap-1 md:w-36 md:shrink-0">
            <span className="text-6xl font-bold text-slate-900">{avg.toFixed(1)}</span>
            <RatingStars rating={avg} />
            <span className="text-xs text-slate-500">{total} valoración{total !== 1 ? "es" : ""}</span>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-2">
            {dist.map(({ star, count }) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-right text-slate-500">{star}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 rounded-full bg-slate-100 h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-4 text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Review list */}
      <div className="space-y-3">
        {reviews.map((review) => {
          const name = review.client.clientProfile?.fullName ?? review.client.email;
          const avatar = review.client.clientProfile?.avatarUrl;
          const date = new Date(review.createdAt).toLocaleDateString("es-NI", {
            day: "numeric", month: "long", year: "numeric",
          });

          return (
            <Card key={review.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={name} src={avatar} size={38} />
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">{name}</p>
                    <p className="text-xs text-slate-400">{date}</p>
                  </div>
                </div>
                <RatingStars rating={review.rating} />
              </div>
              {review.comment ? (
                <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Sin comentario</p>
              )}
            </Card>
          );
        })}
      </div>

      {total === 0 && (
        <Card className="py-12 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-700">Todavía no tenés valoraciones</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando completes trabajos, tus clientes podrán calificarte aquí.
          </p>
        </Card>
      )}
    </DashboardShell>
  );
}
