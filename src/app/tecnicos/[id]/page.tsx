import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { FavoriteButton } from "@/components/forms/favorite-button";
import { StartChatButton } from "@/components/forms/start-chat-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { isTechnicianPubliclyVisible } from "@/lib/subscriptions/service";
import { getSubscriptionPlanBadgeVariant, getSubscriptionPlanLabel } from "@/lib/subscriptions/ui";
import { MapPin } from "lucide-react";
import { LeafletMapViewerWrapper } from "@/components/maps/leaflet-map-viewer-wrapper";

type Params = {
  id: string;
};

export default async function TecnicoDetallePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;

  const { technician, hasWarning } = await (async () => {
    try {
      const technicianData = await prisma.technicianProfile.findUnique({
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

      return { technician: technicianData, hasWarning: false };
    } catch (error) {
      console.error("[public][tecnico-detalle] Error cargando perfil técnico", error);
      return { technician: null, hasWarning: true };
    }
  })();

  if (hasWarning) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-12 md:px-6">
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      </div>
    );
  }

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
            <StartChatButton recipientUserId={technician.user.id} label="Contactar" variant="secondary" />
            <Link
              href={`/dashboard/cliente/solicitudes?tecnicoId=${technician.user.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
            >
              Agendar Servicio
            </Link>
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

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Servicios Ofrecidos</h2>
        {technician.services.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technician.services.map((service) => (
              <div key={service.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-slate-900">{service.title}</h3>
                    {service.basePrice !== null ? (
                      <span className="text-sm font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg shrink-0">
                        C$ {service.basePrice.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 italic shrink-0 bg-slate-100 px-2.5 py-1 rounded-lg">
                        Precio a convenir
                      </span>
                    )}
                  </div>
                  <Badge variant="neutral" className="mt-1.5 text-[11px] py-0.5 px-2">
                    {service.category.name}
                  </Badge>
                  {service.description ? (
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{service.description}</p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400 italic">Sin descripción adicional.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Este técnico no ha registrado servicios específicos aún.</p>
        )}
      </Card>

      {technician.latitude && technician.longitude ? (
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-block p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <MapPin className="h-5 w-5" />
            </span>
            Ubicación del Taller
          </h2>
          <p className="text-sm text-slate-500">
            Encuentra el taller físico de {technician.displayName} en Managua.
          </p>
          <LeafletMapViewerWrapper
            lat={technician.latitude}
            lng={technician.longitude}
            displayName={technician.displayName}
            businessName={technician.businessName}
          />
        </Card>
      ) : null}

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
