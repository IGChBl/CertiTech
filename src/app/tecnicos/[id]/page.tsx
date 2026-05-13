import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { FavoriteButton } from "@/components/forms/favorite-button";
import { StartChatButton } from "@/components/forms/start-chat-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isTechnicianPubliclyVisible } from "@/lib/subscriptions/service";
import { getSubscriptionPlanBadgeVariant, getSubscriptionPlanLabel } from "@/lib/subscriptions/ui";

type Params = {
  id: string;
};

export default async function TecnicoDetallePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  const technician = await prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          status: true,
          isEmailVerified: true,
        },
      },
      services: {
        include: {
          category: true,
        },
      },
      reviews: {
        where: { isHidden: false },
        include: {
          client: {
            include: {
              clientProfile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });

  if (
    !technician ||
    !isTechnicianPubliclyVisible({
      verification: technician.verification,
      subscriptionPlan: technician.subscriptionPlan,
      subscriptionStatus: technician.subscriptionStatus,
      subscriptionEndDate: technician.subscriptionEndDate,
      policeRecordUrl: technician.policeRecordUrl,
      userStatus: technician.user.status,
      isEmailVerified: technician.user.isEmailVerified,
    })
  ) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 md:px-6">
      <Card className="space-y-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <UserAvatar name={technician.displayName} src={technician.avatarUrl} size={88} />
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{technician.displayName}</h1>
              <p className="text-slate-600">{technician.businessName ?? "Profesional independiente"}</p>
              <p className="mt-1 text-sm text-slate-500">
                {technician.city}
                {technician.workZone ? ` - ${technician.workZone}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Técnico verificado</Badge>
            <Badge variant={getSubscriptionPlanBadgeVariant(technician.subscriptionPlan)}>
              Premium {getSubscriptionPlanLabel(technician.subscriptionPlan)}
            </Badge>
            <FavoriteButton technicianProfileId={technician.id} />
            <StartChatButton recipientUserId={technician.user.id} />
          </div>
        </div>

        <RatingStars rating={technician.averageRating} count={technician.totalReviews} />

        <p className="text-slate-700">{technician.description}</p>

        <div className="flex flex-wrap gap-2">
          {technician.services.map((service) => (
            <Badge key={service.id} variant="neutral">
              {service.category.name}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Comentarios recientes</h2>
        {technician.reviews.length ? (
          <div className="space-y-3">
            {technician.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={review.client.clientProfile?.fullName ?? "Cliente"}
                      src={review.client.clientProfile?.avatarUrl}
                      size={32}
                    />
                    <p className="font-medium text-slate-900">
                      {review.client.clientProfile?.fullName ?? "Cliente"}
                    </p>
                  </div>
                  <RatingStars rating={review.rating} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{review.comment ?? "Sin comentario"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Este técnico aún no tiene comentarios publicados.</p>
        )}
      </Card>
    </div>
  );
}
