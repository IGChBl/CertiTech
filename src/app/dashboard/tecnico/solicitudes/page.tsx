import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RequestStatusUpdater } from "@/components/forms/request-status-updater";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import {
  hasActivePaidSubscription,
  hasTechnicianPoliceRecord,
  POLICE_RECORD_REQUIRED_MESSAGE,
} from "@/lib/subscriptions/service";

export default async function TecnicoSolicitudesPage() {
  const user = await requirePageRole("TECHNICIAN");
  const profile = user.technicianProfile;
  const restrictionMessage = !user.isEmailVerified
    ? "Debes verificar tu correo para recibir nuevas solicitudes."
    : !hasTechnicianPoliceRecord(profile?.policeRecordUrl)
      ? POLICE_RECORD_REQUIRED_MESSAGE
    : profile?.verification !== "VERIFIED"
      ? "Tu perfil técnico aún no está verificado. Podrás recibir nuevas solicitudes cuando sea aprobado."
      : "Tu suscripción no está activa. Puedes gestionar trabajos ya asignados, pero no recibir nuevas solicitudes.";
  const canReceiveNewRequests = profile
    ? user.isEmailVerified &&
      hasTechnicianPoliceRecord(profile.policeRecordUrl) &&
      profile.verification === "VERIFIED" &&
      hasActivePaidSubscription({
        subscriptionPlan: profile.subscriptionPlan,
        subscriptionStatus: profile.subscriptionStatus,
        subscriptionEndDate: profile.subscriptionEndDate,
        policeRecordUrl: profile.policeRecordUrl,
      })
    : false;

  const categoryIds = profile
    ? (
        await prisma.technicianService.findMany({
          where: { technicianId: profile.id },
          select: { categoryId: true },
        })
      ).map((service) => service.categoryId)
    : [];
  const availableLeadFilters = canReceiveNewRequests
    ? [{ technicianId: null, status: "PENDING" as const, categoryId: { in: categoryIds } }]
    : [];

  const requests = await prisma.serviceRequest.findMany({
    where: {
      OR: [
        { technicianId: user.id },
        ...availableLeadFilters,
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
      links={[...technicianDashboardLinks]}
    >
      {!canReceiveNewRequests ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{restrictionMessage}</p>
        </Card>
      ) : null}
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
            <p className="text-xs text-slate-500">Categoría: {request.category.name}</p>

            <RequestStatusUpdater requestId={request.id} currentStatus={request.status} />
          </Card>
        ))}
      </div>
      {!requests.length ? <Card>No hay solicitudes disponibles por ahora.</Card> : null}
    </DashboardShell>
  );
}
