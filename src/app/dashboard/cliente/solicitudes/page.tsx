import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { ServiceRequestForm } from "@/components/forms/service-request-form";
import { buildPublicTechnicianWhere } from "@/lib/subscriptions/service";
import { StartChatButton } from "@/components/forms/start-chat-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Calendar, MapPin, DollarSign, AlertCircle } from "lucide-react";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuración" },
];

export default async function ClienteSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ tecnicoId?: string }>;
}) {
  const params = await searchParams;
  const defaultTechnicianId = params.tecnicoId;

  const user = await requirePageRole("CLIENT");
  const clientStatus = user.clientProfile?.verificationStatus ?? "PENDING";
  const canCreateRequests =
    user.isEmailVerified && (clientStatus === "BASIC_VERIFIED" || clientStatus === "VERIFIED");

  const restrictionMessage =
    clientStatus === "REJECTED"
      ? "Tu verificación fue rechazada. Revisa el motivo y actualiza tu información para solicitar una nueva revisión."
      : "Tu cuenta está pendiente de verificación. Algunas funciones estarán limitadas hasta completar el proceso.";

  const categoriesResult = await prisma.serviceCategory
    .findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })
    .then((data) => ({ categories: data, hasWarning: false }))
    .catch((error) => {
      console.error("[dashboard][cliente][solicitudes] Error cargando categorías", error);
      return { categories: [], hasWarning: true };
    });

  const techniciansResult = canCreateRequests
    ? await prisma.technicianProfile
        .findMany({
          where: buildPublicTechnicianWhere(),
          orderBy: [
            { featuredUntil: "desc" },
            { subscriptionPlan: "desc" },
            { averageRating: "desc" },
            { totalReviews: "desc" },
          ],
          take: 50,
          select: { userId: true, displayName: true, businessName: true },
        })
        .then((data) => ({ technicians: data, hasWarning: false }))
        .catch((error) => {
          console.error("[dashboard][cliente][solicitudes] Error cargando técnicos", error);
          return { technicians: [], hasWarning: true };
        })
    : { technicians: [], hasWarning: false };

  const requestsResult = await prisma.serviceRequest
    .findMany({
      where: { clientId: user.id },
      include: {
        category: true,
        technician: {
          select: {
            id: true,
            technicianProfile: {
              select: {
                displayName: true,
                businessName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    .then((data) => ({ requests: data, hasWarning: false }))
    .catch((error) => {
      console.error("[dashboard][cliente][solicitudes] Error cargando historial", error);
      return { requests: [], hasWarning: true };
    });

  const categories = categoriesResult.categories;
  const technicians = techniciansResult.technicians;
  const requests = requestsResult.requests;
  const hasWarning =
    categoriesResult.hasWarning || techniciansResult.hasWarning || requestsResult.hasWarning;

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
    ACCEPTED: "Aceptado",
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
      title="Mis solicitudes"
      subtitle="Publica nuevas necesidades y monitorea su estado de contratación."
      links={clientLinks}
    >
      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="p-1 bg-slate-100 text-slate-700 rounded-lg">
            <Calendar className="h-5 w-5" />
          </span>
          Agendar o Solicitar un Servicio
        </h2>
        {canCreateRequests ? (
          <ServiceRequestForm
            categories={categories}
            technicians={technicians.map((item) => ({
              userId: item.userId,
              label: item.businessName ? `${item.displayName} - ${item.businessName}` : item.displayName,
            }))}
            defaultTechnicianId={defaultTechnicianId}
          />
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{restrictionMessage}</p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
          Historial de Solicitudes
        </h2>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition duration-200 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                      {request.category.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        urgencyColors[request.urgency]
                      }`}
                    >
                      Urgencia: {urgencyLabels[request.urgency]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{request.title}</h3>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                    statusColors[request.status]
                  }`}
                >
                  {statusLabels[request.status]}
                </span>
              </div>

              <p className="text-sm text-slate-600">{request.description}</p>

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
                  <span>
                    Presupuesto:{" "}
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
                    <span>Fecha: {new Date(request.desiredDate).toLocaleString("es-NI")}</span>
                  </div>
                )}
              </div>

              {/* Technician Info & Quick Chat */}
              {request.technician ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 border border-slate-150 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={request.technician.technicianProfile?.displayName}
                      src={request.technician.technicianProfile?.avatarUrl}
                      size={40}
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Técnico Asignado</p>
                      <p className="text-sm font-bold text-slate-900">
                        {request.technician.technicianProfile?.displayName}
                      </p>
                      {request.technician.technicianProfile?.businessName && (
                        <p className="text-xs text-slate-500">
                          {request.technician.technicianProfile.businessName}
                        </p>
                      )}
                    </div>
                  </div>

                  <StartChatButton
                    recipientUserId={request.technician.id}
                    label="Conversar con Técnico"
                    variant="primary"
                    className="w-full sm:w-auto flex items-center gap-2 text-xs py-2 h-auto"
                    classNameWrapper="w-full sm:w-auto"
                  />
                </div>
              ) : (
                request.technicianId && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl bg-slate-50 p-3 border border-slate-150">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>El técnico asignado ha desactivado temporalmente su perfil.</span>
                  </div>
                )
              )}
            </div>
          ))}
          {!requests.length ? <p className="text-sm text-slate-600">Aún no has publicado solicitudes.</p> : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
