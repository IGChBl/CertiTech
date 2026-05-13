import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuración" },
];

export default async function ClienteFavoritosPage() {
  const user = await requirePageRole("CLIENT");

  const favorites = await prisma.favorite.findMany({
    where: { clientId: user.id },
    include: {
      technicianProfile: {
        include: {
          services: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Mis favoritos" subtitle="Técnicos guardados para futuras contrataciones." links={clientLinks}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((favorite) => (
          <Card key={favorite.id}>
            <div className="mb-2 flex items-center gap-3">
              <UserAvatar
                name={favorite.technicianProfile.displayName}
                src={favorite.technicianProfile.avatarUrl}
                size={44}
              />
              <h3 className="text-lg font-semibold text-slate-900">{favorite.technicianProfile.displayName}</h3>
            </div>
            <p className="text-sm text-slate-600">{favorite.technicianProfile.city}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {favorite.technicianProfile.services.slice(0, 3).map((service) => (
                <Badge key={service.id} variant="neutral">
                  {service.category.name}
                </Badge>
              ))}
            </div>
            <Link
              href={`/tecnicos/${favorite.technicianProfile.id}`}
              className="mt-4 inline-block text-sm font-semibold text-slate-900 underline"
            >
              Ver perfil
            </Link>
          </Card>
        ))}
      </div>
      {!favorites.length ? <Card>No tienes técnicos guardados todavía.</Card> : null}
    </DashboardShell>
  );
}
