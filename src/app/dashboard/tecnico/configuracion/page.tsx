import Link from "next/link";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { TechnicianProfessionalProfileForm } from "@/components/forms/technician-professional-profile-form";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { AvatarUploader } from "@/components/forms/avatar-uploader";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import { TechnicianLocationForm } from "@/components/forms/technician-location-form";
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

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default async function TecnicoConfiguracionPage() {
  const user = await requirePageRole("TECHNICIAN");
  const status = user.technicianProfile?.verification ?? "PENDING";
  const isVerified = status === "VERIFIED";
  const emailVerified = user.isEmailVerified;
  const profile = user.technicianProfile;
  const hasPoliceRecord = hasTechnicianPoliceRecord(profile?.policeRecordUrl);
  const subscriptionActive = profile
    ? hasActivePaidSubscription({
        subscriptionPlan: profile.subscriptionPlan,
        subscriptionStatus: profile.subscriptionStatus,
        subscriptionEndDate: profile.subscriptionEndDate,
        policeRecordUrl: profile.policeRecordUrl,
      })
    : false;
  const daysRemaining = profile ? getSubscriptionDaysRemaining(profile.subscriptionEndDate) : null;

  return (
    <DashboardShell
      title="Configuración técnica"
      subtitle="Administra tu perfil público profesional."
      links={[...technicianDashboardLinks]}
    >
      <Card className="space-y-2">
        <AvatarUploader
          displayName={user.technicianProfile?.displayName}
          currentAvatarUrl={user.technicianProfile?.avatarUrl}
          subtitle="Tu foto será visible en tarjetas, perfil público y paneles internos."
        />
        <p className="text-sm text-slate-600">Nombre: {user.technicianProfile?.displayName}</p>
        <p className="text-sm text-slate-600">Correo: {user.email}</p>
        <p className="text-sm text-slate-600">Ciudad: {user.technicianProfile?.city}</p>
        <p className="text-sm text-slate-600">Zona: {user.technicianProfile?.workZone}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-600">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Sí" : "No"}</Badge>
        </div>
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu correo aún no está verificado. Revisa tu bandeja o reenvía el correo.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        <Badge variant={getVerificationColor(status)}>Estado: {getVerificationLabel(status)}</Badge>
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Para garantizar seguridad y confianza en CertiTech, todos los técnicos deben subir un récord policial
          vigente antes de ser aprobados.
        </p>
        {!hasPoliceRecord ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{POLICE_RECORD_REQUIRED_MESSAGE}</p>
        ) : null}
        {profile ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getSubscriptionPlanBadgeVariant(profile.subscriptionPlan)}>
              Plan: {getSubscriptionPlanLabel(profile.subscriptionPlan)}
            </Badge>
            <Badge variant={getSubscriptionStatusBadgeVariant(profile.subscriptionStatus)}>
              Suscripción: {getSubscriptionStatusLabel(profile.subscriptionStatus)}
            </Badge>
            {daysRemaining !== null ? <span className="text-xs text-slate-500">Días restantes: {daysRemaining}</span> : null}
          </div>
        ) : null}
        {!isVerified && status !== "REJECTED" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu perfil está en revisión. Podrás aparecer en búsquedas y recibir solicitudes cuando sea aprobado por
            CertiTech.
          </p>
        ) : null}
        {status === "REJECTED" ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Tu verificación fue rechazada. Revisa el motivo y actualiza tu información para solicitar una nueva
            revisión.
          </p>
        ) : null}
        {status === "REJECTED" && user.technicianProfile?.rejectionReason ? (
          <p className="text-sm text-rose-700">Motivo de rechazo: {user.technicianProfile.rejectionReason}</p>
        ) : null}
        {isVerified && !subscriptionActive ? (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Tu suscripción no está activa. Activa un plan para aparecer públicamente y recibir nuevas solicitudes.
          </p>
        ) : null}
        <Link href="/dashboard/tecnico/suscripcion" className="inline-block text-sm font-semibold text-slate-900 underline">
          Ver gestión de suscripción
        </Link>
      </Card>

      <TechnicianLocationForm
        initialLat={user.technicianProfile?.latitude}
        initialLng={user.technicianProfile?.longitude}
      />

      <TechnicianProfessionalProfileForm
        initialIdentityDocumentUrl={user.technicianProfile?.identityDocumentUrl}
        initialPoliceRecordUrl={
          user.technicianProfile?.policeRecordUrl ? "/api/technician/profile-assets/police-record" : null
        }
        initialWorkEvidences={asStringArray(user.technicianProfile?.workEvidenceJson)}
        initialCertifications={asStringArray(user.technicianProfile?.certificationsJson)}
        initialReferencePriceMin={user.technicianProfile?.referencePriceMin}
        initialReferencePriceMax={user.technicianProfile?.referencePriceMax}
        hasActiveSubscription={subscriptionActive}
        verificationStatus={status}
      />
    </DashboardShell>
  );
}
