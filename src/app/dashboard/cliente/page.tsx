import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuracion" },
];

export default async function ClienteDashboardPage() {
  const user = await requirePageRole("CLIENT");

  const [requestsCount, favoritesCount, chatsCount, reviewsCount] = await Promise.all([
    prisma.serviceRequest.count({ where: { clientId: user.id } }),
    prisma.favorite.count({ where: { clientId: user.id } }),
    prisma.chatParticipant.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { clientId: user.id } }),
  ]);

  return (
    <DashboardShell
      title={`Hola, ${user.clientProfile?.fullName ?? "cliente"}`}
      subtitle="Administra tus solicitudes, conversaciones y tecnicos favoritos."
      links={clientLinks}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Solicitudes", value: requestsCount },
          { label: "Favoritos", value: favoritesCount },
          { label: "Chats", value: chatsCount },
          { label: "Resenas escritas", value: reviewsCount },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
