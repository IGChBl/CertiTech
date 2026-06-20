import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Star } from "lucide-react";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuración" },
];

export default async function ClienteResenasPage() {
  const user = await requirePageRole("CLIENT");

  const reviews = await prisma.review.findMany({
    where: { clientId: user.id },
    include: {
      technicianProfile: {
        select: { displayName: true, avatarUrl: true, businessName: true },
      },
      serviceRequest: {
        select: { title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = reviews.length;

  return (
    <DashboardShell
      title="Mis reseñas"
      subtitle="Historial de valoraciones que dejaste a los técnicos."
      links={clientLinks}
    >
      {total > 0 && (
        <p className="text-sm text-slate-500">
          {total} reseña{total !== 1 ? "s" : ""} publicada{total !== 1 ? "s" : ""}
        </p>
      )}

      <div className="space-y-3">
        {reviews.map((review) => {
          const date = new Date(review.createdAt).toLocaleDateString("es-NI", {
            day: "numeric", month: "long", year: "numeric",
          });

          return (
            <Card key={review.id} className="space-y-3">
              {/* Header: technician info + rating */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={review.technicianProfile.displayName}
                    src={review.technicianProfile.avatarUrl}
                    size={40}
                  />
                  <div>
                    <p className="font-semibold text-slate-900 leading-tight">
                      {review.technicianProfile.displayName}
                    </p>
                    {review.technicianProfile.businessName && (
                      <p className="text-xs text-slate-500">{review.technicianProfile.businessName}</p>
                    )}
                    <p className="text-xs text-slate-400">{date}</p>
                  </div>
                </div>
                <RatingStars rating={review.rating} />
              </div>

              {/* Service reference */}
              <p className="text-xs text-slate-400 border-l-2 border-slate-200 pl-2">
                Servicio: {review.serviceRequest.title}
              </p>

              {/* Comment */}
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
          <p className="font-medium text-slate-700">Todavía no dejaste reseñas</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando finalices un servicio, podrás valorar al técnico desde tus solicitudes.
          </p>
        </Card>
      )}
    </DashboardShell>
  );
}
