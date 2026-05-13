import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import { TechnicianSubscriptionRenewal } from "@/components/forms/technician-subscription-renewal";
import {
  getSubscriptionDaysRemaining,
  hasActivePaidSubscription,
  hasTechnicianPoliceRecord,
  isSubscriptionDateExpired,
  POLICE_RECORD_REQUIRED_MESSAGE,
} from "@/lib/subscriptions/service";
import {
  getSubscriptionPlanBadgeVariant,
  getSubscriptionPlanLabel,
  getSubscriptionStatusBadgeVariant,
  getSubscriptionStatusLabel,
} from "@/lib/subscriptions/ui";

function formatDate(date: Date | null | undefined) {
  if (!date) return "No definida";
  return new Date(date).toLocaleDateString("es-NI");
}

export default async function TecnicoSuscripcionPage() {
  const user = await requirePageRole("TECHNICIAN");
  const profile = user.technicianProfile;

  if (!profile) {
    return (
      <DashboardShell
        title="Suscripción"
        subtitle="Administra tu plan para publicar servicios y recibir nuevos clientes."
        links={[...technicianDashboardLinks]}
      >
        <Card>
          <p className="text-sm text-slate-600">No encontramos tu perfil técnico. Completa tu registro para continuar.</p>
        </Card>
      </DashboardShell>
    );
  }

  const isActive = hasActivePaidSubscription({
    subscriptionPlan: profile.subscriptionPlan,
    subscriptionStatus: profile.subscriptionStatus,
    subscriptionEndDate: profile.subscriptionEndDate,
    policeRecordUrl: profile.policeRecordUrl,
  });
  const hasPoliceRecord = hasTechnicianPoliceRecord(profile.policeRecordUrl);
  const daysRemaining = getSubscriptionDaysRemaining(profile.subscriptionEndDate);
  const expiringSoon = isActive && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;
  const expiredByDate = isSubscriptionDateExpired(profile.subscriptionEndDate);

  return (
    <DashboardShell
      title="Suscripción técnica"
      subtitle="Controla tu plan, visibilidad y acceso a nuevos contactos dentro de CertiTech."
      links={[...technicianDashboardLinks]}
    >
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Plan actual:</p>
          <Badge variant={getSubscriptionPlanBadgeVariant(profile.subscriptionPlan)}>
            {getSubscriptionPlanLabel(profile.subscriptionPlan)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Estado:</p>
          <Badge variant={getSubscriptionStatusBadgeVariant(profile.subscriptionStatus)}>
            {getSubscriptionStatusLabel(profile.subscriptionStatus)}
          </Badge>
        </div>
        <p className="text-sm text-slate-600">Inicio: {formatDate(profile.subscriptionStartDate)}</p>
        <p className="text-sm text-slate-600">Vencimiento: {formatDate(profile.subscriptionEndDate)}</p>
        <p className="text-sm text-slate-600">Último pago: {formatDate(profile.lastPaymentDate)}</p>
        <p className="text-sm text-slate-600">Renovación automática: {profile.autoRenew ? "Activa" : "Inactiva"}</p>
        {daysRemaining !== null ? <p className="text-sm text-slate-600">Días restantes: {daysRemaining}</p> : null}

        {expiringSoon ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu suscripción vence en {daysRemaining} días. Renueva para mantener tu posición en los listados.
          </p>
        ) : null}
        {expiredByDate || profile.subscriptionStatus === "EXPIRED" ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Tu suscripción expiró. Tu perfil no aparecerá en búsquedas hasta renovarla.
          </p>
        ) : null}
        {!isActive ? (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Activa un plan mensual o anual para aparecer públicamente y recibir nuevas solicitudes.
          </p>
        ) : null}
        {!hasPoliceRecord ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{POLICE_RECORD_REQUIRED_MESSAGE}</p>
        ) : null}
      </Card>

      <TechnicianSubscriptionRenewal
        currentPlan={profile.subscriptionPlan}
        currentStatus={profile.subscriptionStatus}
        defaultAutoRenew={profile.autoRenew}
        requiresPoliceRecord={hasPoliceRecord}
      />
    </DashboardShell>
  );
}
