import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuracion" },
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
    <DashboardShell title="Mis favoritos" subtitle="Tecnicos guardados para futuras contrataciones." links={clientLinks}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favorites.map((favorite) => (
          <Card key={favorite.id}>
            <h3 className="text-lg font-semibold text-slate-900">{favorite.technicianProfile.displayName}</h3>
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
      {!favorites.length ? <Card>No tienes tecnicos guardados todavia.</Card> : null}
    </DashboardShell>
  );
}
