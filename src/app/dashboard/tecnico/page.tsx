import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { UserAvatar } from "@/components/ui/user-avatar";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import {
  getSubscriptionDaysRemaining,
  hasActivePaidSubscription,
  hasTechnicianPoliceRecord,
  POLICE_RECORD_REQUIRED_MESSAGE,
} from "@/lib/subscriptions/service";
import {
  getSubscriptionPlanBadgeVariant,
  getSubscriptionPlanLabel,
  getSubscriptionStatusBadgeVariant,
  getSubscriptionStatusLabel,
} from "@/lib/subscriptions/ui";

export default async function TecnicoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ email_notice?: string }>;
}) {
  const params = await searchParams;
  const user = await requirePageRole("TECHNICIAN");
  const profile = user.technicianProfile;
  const verificationStatus = user.technicianProfile?.verification ?? "PENDING";
  const isVerified = verificationStatus === "VERIFIED";
  const emailVerified = user.isEmailVerified;
  const showEmailDeliveryWarning = params.email_notice === "delivery_failed";
  const hasActiveSubscription = profile
    ? hasActivePaidSubscription({
        subscriptionPlan: profile.subscriptionPlan,
        subscriptionStatus: profile.subscriptionStatus,
        subscriptionEndDate: profile.subscriptionEndDate,
        policeRecordUrl: profile.policeRecordUrl,
      })
    : false;
  const hasPoliceRecord = hasTechnicianPoliceRecord(profile?.policeRecordUrl);
  const hasOperationalAccess = hasActiveSubscription && hasPoliceRecord;
  const daysRemaining = profile ? getSubscriptionDaysRemaining(profile.subscriptionEndDate) : null;
  const expiringSoon = hasOperationalAccess && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

  let assigned = 0;
  let completed = 0;
  let reviews = 0;
  let pendingRequests = 0;
  let hasWarning = false;

  try {
    const availableCategoryIds =
      isVerified && hasOperationalAccess && user.technicianProfile
        ? (
            await prisma.technicianService.findMany({
              where: { technicianId: user.technicianProfile.id },
              select: { categoryId: true },
            })
          ).map((service) => service.categoryId)
        : [];

    [assigned, completed, reviews, pendingRequests] = await prisma.$transaction([
      prisma.serviceRequest.count({ where: { technicianId: user.id } }),
      prisma.serviceRequest.count({ where: { technicianId: user.id, status: "COMPLETED" } }),
      prisma.review.count({
        where: {
          technicianProfileId: user.technicianProfile?.id,
        },
      }),
      prisma.serviceRequest.count({
        where: {
          technicianId: null,
          status: "PENDING",
          categoryId: { in: availableCategoryIds },
        },
      }),
    ]);
  } catch (error) {
    console.error("[dashboard][tecnico] Error cargando métricas", error);
    hasWarning = true;
  }

  return (
    <DashboardShell
      title={`Panel técnico: ${user.technicianProfile?.displayName ?? user.email}`}
      subtitle="Gestiona solicitudes, conversaciones y reputación desde un solo lugar."
      links={[...technicianDashboardLinks]}
    >
      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <div className="flex items-center gap-3 pb-1">
          <UserAvatar
            name={user.technicianProfile?.displayName}
            src={user.technicianProfile?.avatarUrl}
            size={52}
            className="ring-2 ring-white"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {user.technicianProfile?.displayName ?? "Perfil técnico"}
            </p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Sí" : "No"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Estado de verificación:</p>
          <Badge variant={getVerificationColor(verificationStatus)}>{getVerificationLabel(verificationStatus)}</Badge>
        </div>
        {profile ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-700">Plan:</p>
              <Badge variant={getSubscriptionPlanBadgeVariant(profile.subscriptionPlan)}>
                {getSubscriptionPlanLabel(profile.subscriptionPlan)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-700">Suscripción:</p>
              <Badge variant={getSubscriptionStatusBadgeVariant(profile.subscriptionStatus)}>
                {getSubscriptionStatusLabel(profile.subscriptionStatus)}
              </Badge>
            </div>
          </>
        ) : null}
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Debes verificar tu correo para habilitar publicaciones y contrataciones tecnicas.
          </p>
        ) : null}
        {!hasPoliceRecord ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {POLICE_RECORD_REQUIRED_MESSAGE}
          </p>
        ) : null}
        {showEmailDeliveryWarning ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu cuenta fue creada, pero no se pudo enviar el correo de verificación. Usa el botón de reenvío.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        {!isVerified && verificationStatus !== "REJECTED" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu perfil está en revisión. Podrás aparecer en búsquedas y recibir solicitudes cuando sea aprobado por
            CertiTech.
          </p>
        ) : null}
        {isVerified && !hasOperationalAccess ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {!hasPoliceRecord
              ? POLICE_RECORD_REQUIRED_MESSAGE
              : "Tu plan actual no permite recibir nuevos contactos. Activa una suscripción para aparecer en búsquedas."}
          </p>
        ) : null}
        {expiringSoon ? (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Tu suscripción vence en {daysRemaining} días. Renueva para mantener tu visibilidad.
          </p>
        ) : null}
        {verificationStatus === "REJECTED" ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Tu verificación fue rechazada. Revisa el motivo y actualiza tu información para solicitar una nueva
            revisión.
          </p>
        ) : null}
        <Link href="/dashboard/tecnico/suscripcion" className="inline-block text-sm font-semibold text-slate-900 underline">
          Administrar suscripción
        </Link>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Solicitudes asignadas", value: assigned },
          { label: "Trabajos completados", value: completed },
          { label: "Valoraciones", value: reviews },
          { label: "Solicitudes disponibles", value: pendingRequests },
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
