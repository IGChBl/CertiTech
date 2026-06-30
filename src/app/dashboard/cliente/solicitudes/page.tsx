import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { StartChatButton } from "@/components/forms/start-chat-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Calendar, MapPin, DollarSign, AlertCircle, Star, ShieldCheck } from "lucide-react";
import { ReviewForm } from "@/components/forms/review-form";
import { PaymentActions } from "@/components/forms/payment-actions";

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
  searchParams: Promise<{ pago?: string }>;
}) {
  const params = await searchParams;
  const pagoOk = params.pago === "ok";

  const user = await requirePageRole("CLIENT");

  // Only paid services belong in the history now: a ServiceRequest gains a Payment
  // exclusively through the in-chat payment flow. This naturally excludes
  // AWAITING_PAYMENT (no payment yet) and surfaces paid / in-progress / completed.
  const requestsResult = await prisma.serviceRequest
    .findMany({
      where: { clientId: user.id, payment: { isNot: null } },
      include: {
        category: true,
        review: { select: { id: true, rating: true } },
        payment: true,
        technician: {
          select: {
            id: true,
            technicianProfile: {
              select: { id: true, displayName: true, businessName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    .then((data) => ({ requests: data, hasWarning: false }))
    .catch(() => ({ requests: [], hasWarning: true }));

  const requests = requestsResult.requests;
  const hasWarning = requestsResult.hasWarning;

  const urgencyLabels: Record<string, string> = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
  const urgencyColors: Record<string, string> = {
    LOW: "bg-blue-50 text-blue-800 border-blue-100",
    MEDIUM: "bg-slate-100 text-slate-800 border-slate-200",
    HIGH: "bg-amber-50 text-amber-800 border-amber-100",
    URGENT: "bg-rose-50 text-rose-800 border-rose-100",
  };
  const statusLabels: Record<string, string> = {
    AWAITING_PAYMENT: "Pendiente de pago",
    PENDING: "Pendiente",
    ACCEPTED: "Aceptado",
    IN_PROGRESS: "En Progreso",
    COMPLETED: "Completado",
    CANCELED: "Cancelado",
  };
  const statusColors: Record<string, string> = {
    AWAITING_PAYMENT: "bg-violet-50 text-violet-800 border-violet-200",
    PENDING: "bg-amber-50 text-amber-800 border-amber-200",
    ACCEPTED: "bg-blue-50 text-blue-800 border-blue-200",
    IN_PROGRESS: "bg-indigo-50 text-indigo-800 border-indigo-200",
    COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
    CANCELED: "bg-rose-50 text-rose-800 border-rose-200",
  };

  const paymentStatusLabel: Record<string, string> = {
    PENDING: "Pago pendiente",
    HELD: "Pago retenido en escrow",
    RELEASED: "Pago liberado al técnico",
    REFUNDED: "Reembolso procesado",
  };
  const paymentStatusColor: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    HELD: "bg-violet-50 text-violet-700 border-violet-200",
    RELEASED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REFUNDED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <DashboardShell
      title="Mis solicitudes"
      subtitle="Historial de servicios confirmados y pagados desde tus conversaciones."
      links={clientLinks}
    >
      {hasWarning && (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      )}

      {pagoOk && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium text-emerald-800">
            ¡Pago recibido! El dinero quedará retenido hasta que confirmes la recepción del servicio.
          </p>
        </div>
      )}

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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${urgencyColors[request.urgency]}`}
                    >
                      Urgencia: {urgencyLabels[request.urgency]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{request.title}</h3>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusColors[request.status]}`}
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
                    {request.agreedPrice
                      ? `Precio acordado: C$ ${request.agreedPrice.toLocaleString()}`
                      : request.budgetMin !== null || request.budgetMax !== null
                        ? `Presupuesto: ${request.budgetMin !== null ? `C$ ${request.budgetMin.toLocaleString()}` : "0"} - ${request.budgetMax !== null ? `C$ ${request.budgetMax.toLocaleString()}` : "Max"}`
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

              {/* Estado del pago en escrow */}
              {request.payment && request.payment.status !== "PENDING" && (
                <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${paymentStatusColor[request.payment.status]}`}>
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{paymentStatusLabel[request.payment.status]}</p>
                    {request.payment.status === "HELD" && (
                      <p className="text-xs opacity-80">C$ {request.payment.amount.toLocaleString()} retenidos hasta que confirmes el servicio.</p>
                    )}
                    {request.payment.status === "REFUNDED" && request.payment.refundReason && (
                      <p className="text-xs opacity-80">Motivo: {request.payment.refundReason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Acciones de pago: confirmar o pedir reembolso */}
              {request.payment?.status === "HELD" && request.status !== "AWAITING_PAYMENT" && (
                <PaymentActions
                  paymentId={request.payment.id}
                  amount={request.payment.amount}
                  requestStatus={request.status}
                />
              )}

              {/* Review — solo para servicios completados con técnico asignado */}
              {request.status === "COMPLETED" && request.technician?.technicianProfile && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Star className="h-4 w-4 text-amber-400" />
                    {request.review ? "Tu valoración" : "Valorar este servicio"}
                  </div>
                  {request.review ? (
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-5 w-5 ${n <= request.review!.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                        />
                      ))}
                      <span className="text-sm text-slate-500">Ya valoraste este servicio</span>
                    </div>
                  ) : (
                    <ReviewForm
                      serviceRequestId={request.id}
                      technicianProfileId={request.technician.technicianProfile.id}
                      technicianName={request.technician.technicianProfile.displayName}
                    />
                  )}
                </div>
              )}

              {/* Info del técnico y chat */}
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
                        <p className="text-xs text-slate-500">{request.technician.technicianProfile.businessName}</p>
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
          {!requests.length && (
            <p className="text-sm text-slate-600">
              Aún no tienes servicios pagados. Cuando aceptes y pagues la propuesta de un técnico en el chat, aparecerá aquí.
            </p>
          )}
        </div>
      </Card>
    </DashboardShell>
  );
}
