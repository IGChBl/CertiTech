import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AdminSubscriptionActions } from "@/components/forms/admin-subscription-actions";
import { getSubscriptionDaysRemaining } from "@/lib/subscriptions/service";
import {
  getSubscriptionPlanBadgeVariant,
  getSubscriptionPlanLabel,
  getSubscriptionStatusBadgeVariant,
  getSubscriptionStatusLabel,
} from "@/lib/subscriptions/ui";

function formatDate(value: Date | null | undefined) {
  if (!value) return "No definido";
  return new Date(value).toLocaleDateString("es-NI");
}

export default async function AdminSuscripcionesPage() {
  await requirePageRole("ADMIN");

  const technicians = await prisma.technicianProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          status: true,
        },
      },
    },
    orderBy: [{ featuredUntil: "desc" }, { subscriptionPlan: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <DashboardShell
      title="Suscripciones técnicas"
      subtitle="Administra plan, estado y vencimiento para controlar visibilidad y captación."
      links={[...adminDashboardLinks]}
    >
      <Card className="space-y-2">
        <p className="text-sm text-slate-600">Total técnicos: {technicians.length}</p>
        <p className="text-sm text-slate-600">
          Activos: {technicians.filter((item) => item.subscriptionStatus === "ACTIVE").length}
        </p>
        <p className="text-sm text-slate-600">
          Pendientes de pago: {technicians.filter((item) => item.subscriptionStatus === "PENDING_PAYMENT").length}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {technicians.map((tech) => {
          const daysRemaining = getSubscriptionDaysRemaining(tech.subscriptionEndDate);

          return (
            <Card key={tech.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar name={tech.displayName} src={tech.avatarUrl} size={42} />
                  <div>
                    <p className="text-base font-semibold text-slate-900">{tech.displayName}</p>
                    <p className="text-sm text-slate-600">{tech.businessName ?? tech.user.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={getSubscriptionPlanBadgeVariant(tech.subscriptionPlan)}>
                    {getSubscriptionPlanLabel(tech.subscriptionPlan)}
                  </Badge>
                  <Badge variant={getSubscriptionStatusBadgeVariant(tech.subscriptionStatus)}>
                    {getSubscriptionStatusLabel(tech.subscriptionStatus)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                <p>Correo verificado: {tech.user.isEmailVerified ? "Sí" : "No"}</p>
                <p>Verificación técnica: {tech.verification}</p>
                <p>Inicio: {formatDate(tech.subscriptionStartDate)}</p>
                <p>Vence: {formatDate(tech.subscriptionEndDate)}</p>
                <p>Último pago: {formatDate(tech.lastPaymentDate)}</p>
                <p>Auto renovación: {tech.autoRenew ? "Activa" : "Inactiva"}</p>
                <p>Destacado hasta: {formatDate(tech.featuredUntil)}</p>
                <p>Días restantes: {daysRemaining ?? "No aplica"}</p>
              </div>

              <AdminSubscriptionActions
                profileId={tech.id}
                currentPlan={tech.subscriptionPlan}
                currentStatus={tech.subscriptionStatus}
                currentEndDate={tech.subscriptionEndDate}
                currentFeaturedUntil={tech.featuredUntil}
                autoRenew={tech.autoRenew}
              />
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
