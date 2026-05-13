import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RequestStatusUpdater } from "@/components/forms/request-status-updater";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoSolicitudesPage() {
  const user = await requirePageRole("TECHNICIAN");

  const categoryIds = user.technicianProfile
    ? (
        await prisma.technicianService.findMany({
          where: { technicianId: user.technicianProfile.id },
          select: { categoryId: true },
        })
      ).map((service) => service.categoryId)
    : [];

  const requests = await prisma.serviceRequest.findMany({
    where: {
      OR: [
        { technicianId: user.id },
        { technicianId: null, status: "PENDING", categoryId: { in: categoryIds } },
      ],
    },
    include: {
      category: true,
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
      title="Solicitudes recibidas"
      subtitle="Acepta, rechaza o actualiza el estado de cada trabajo."
      links={technicianLinks}
    >
      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserAvatar
                  name={request.client.clientProfile?.fullName ?? request.client.email}
                  src={request.client.clientProfile?.avatarUrl}
                  size={36}
                />
                <div>
                  <p className="text-lg font-semibold text-slate-900">{request.title}</p>
                  <p className="text-sm text-slate-600">
                    Cliente: {request.client.clientProfile?.fullName ?? request.client.email} - {request.city}
                  </p>
                </div>
              </div>
              <Badge variant="neutral">{request.status}</Badge>
            </div>

            <p className="text-sm text-slate-700">{request.description}</p>
            <p className="text-xs text-slate-500">Categoria: {request.category.name}</p>

            <RequestStatusUpdater requestId={request.id} currentStatus={request.status} />
          </Card>
        ))}
      </div>
      {!requests.length ? <Card>No hay solicitudes disponibles por ahora.</Card> : null}
    </DashboardShell>
  );
}
