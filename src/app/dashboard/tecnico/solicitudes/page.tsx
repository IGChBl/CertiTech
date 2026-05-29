import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { RequestStatusUpdater } from "@/components/forms/request-status-updater";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { StartChatButton } from "@/components/forms/start-chat-button";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import {
  hasActivePaidSubscription,
  hasTechnicianPoliceRecord,
  POLICE_RECORD_REQUIRED_MESSAGE,
} from "@/lib/subscriptions/service";
import { Calendar, MapPin, DollarSign, AlertCircle, Wrench } from "lucide-react";

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

  const { requests, hasWarning } = await (async () => {
    try {
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

      const data = await prisma.serviceRequest.findMany({
        where: {
          OR: [{ technicianId: user.id }, ...availableLeadFilters],
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

      return { requests: data, hasWarning: false };
    } catch (error) {
      console.error("[dashboard][tecnico][solicitudes] Error cargando solicitudes", error);
      return { requests: [], hasWarning: true };
    }
  })();

  const urgencyLabels: Record<string, string> = {
    LOW: "Baja",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

  const urgencyColors: Record<string, string> = {
    LOW: "bg-blue-50 text-blue-800 border-blue-100",
    MEDIUM: "bg-slate-100 text-slate-800 border-slate-200",
    HIGH: "bg-amber-50 text-amber-800 border-amber-100",
    URGENT: "bg-rose-50 text-rose-800 border-rose-100",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Pendiente",
    ACCEPTED: "Aceptado (Asignado)",
    IN_PROGRESS: "En Progreso",
    COMPLETED: "Completado",
    CANCELED: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-800 border-amber-200",
    ACCEPTED: "bg-blue-50 text-blue-800 border-blue-200",
    IN_PROGRESS: "bg-indigo-50 text-indigo-800 border-indigo-200",
    COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    CANCELED: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <DashboardShell
      title="Solicitudes de Trabajo"
      subtitle="Acepta presupuestos, gestiona tus tareas asignadas y coordina con tus clientes."
      links={[...technicianDashboardLinks]}
    >
      {hasWarning ? (
        <Card className="mb-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      {!canReceiveNewRequests ? (
        <Card className="mb-4 bg-amber-50/50 border-amber-200">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>{restrictionMessage}</span>
          </p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {requests.map((request) => {
          const isAssigned = request.technicianId === user.id;

          return (
            <Card key={request.id} className="p-5 space-y-4 border border-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={request.client.clientProfile?.fullName ?? request.client.email}
                    src={request.client.clientProfile?.avatarUrl}
                    size={40}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{request.title}</h3>
                    <p className="text-xs text-slate-500">
                      Cliente: {request.client.clientProfile?.fullName ?? "Usuario de CertiTech"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      urgencyColors[request.urgency]
                    }`}
                  >
                    Urgencia: {urgencyLabels[request.urgency]}
                  </span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                      statusColors[request.status]
                    }`}
                  >
                    {statusLabels[request.status]}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                  {request.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    {request.city}
                    {request.zone ? `, Zona: ${request.zone}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700">
                    Presupuesto Cliente:{" "}
                    {request.budgetMin !== null || request.budgetMax !== null
                      ? `${request.budgetMin !== null ? `C$ ${request.budgetMin.toLocaleString()}` : "0"} - ${
                          request.budgetMax !== null ? `C$ ${request.budgetMax.toLocaleString()}` : "Max"
                        }`
                      : "A convenir"}
                  </span>
                </div>
                {request.desiredDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Fecha deseada: {new Date(request.desiredDate).toLocaleString("es-NI")}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                {/* Actions & Status Management */}
                <div className="flex-1 min-w-[280px]">
                  <RequestStatusUpdater requestId={request.id} currentStatus={request.status} />
                </div>

                {/* Direct Chat Button if assigned */}
                {isAssigned && (
                  <StartChatButton
                    recipientUserId={request.client.id}
                    label="Chatear con Cliente"
                    variant="secondary"
                    className="w-full sm:w-auto flex items-center gap-2 text-xs py-2 h-auto hover:bg-slate-100"
                    classNameWrapper="w-full sm:w-auto"
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {!requests.length ? (
        <Card className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-350 bg-slate-50/50 rounded-2xl text-center space-y-3">
          <div className="p-3 bg-slate-100 text-slate-400 rounded-full">
            <Wrench className="h-8 w-8" />
          </div>
          <div className="max-w-md">
            <h4 className="text-base font-bold text-slate-900">Sin solicitudes disponibles</h4>
            <p className="text-sm text-slate-500 mt-1">
              No tienes solicitudes de servicio activas en este momento. Las solicitudes públicas en tus categorías habilitadas aparecerán aquí cuando estén disponibles.
            </p>
          </div>
        </Card>
      ) : null}
    </DashboardShell>
  );
}
