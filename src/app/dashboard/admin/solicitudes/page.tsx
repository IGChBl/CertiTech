import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminSolicitudesPage() {
  await requirePageRole("ADMIN");

  const requests = await prisma.serviceRequest.findMany({
    include: {
      client: {
        include: {
          clientProfile: true,
        },
      },
      technician: {
        include: {
          technicianProfile: true,
        },
      },
      category: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <DashboardShell
      title="Gestion de solicitudes"
      subtitle="Monitorea el ciclo de contratacion completo."
      links={[...adminDashboardLinks]}
    >
      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{request.title}</p>
              <Badge variant={request.status === "COMPLETED" ? "success" : "neutral"}>{request.status}</Badge>
            </div>
            <p className="text-sm text-slate-600">
              Cliente: {request.client.clientProfile?.fullName ?? request.client.email}
            </p>
            <p className="text-sm text-slate-600">
              Tecnico: {request.technician?.technicianProfile?.displayName ?? "Sin asignar"}
            </p>
            <p className="text-xs text-slate-500">Categoria: {request.category.name}</p>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
