import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  getSubscriptionPlanBadgeVariant,
  getSubscriptionPlanLabel,
  getSubscriptionStatusBadgeVariant,
  getSubscriptionStatusLabel,
} from "@/lib/subscriptions/ui";

export default async function AdminUsuariosPage() {
  await requirePageRole("ADMIN");

  const users = await prisma.user.findMany({
    include: {
      role: true,
      clientProfile: true,
      technicianProfile: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <DashboardShell
      title="Gestión de usuarios"
      subtitle="Búsqueda y monitoreo de cuentas registradas."
      links={[...adminDashboardLinks]}
    >
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2">Usuario</th>
              <th className="px-2 py-2">Rol</th>
              <th className="px-2 py-2">Nombre</th>
              <th className="px-2 py-2">Correo verificado</th>
              <th className="px-2 py-2">Verificación</th>
              <th className="px-2 py-2">Suscripción</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const verificationStatus =
                user.role.code === "CLIENT"
                  ? user.clientProfile?.verificationStatus
                  : user.role.code === "TECHNICIAN"
                    ? user.technicianProfile?.verification
                    : null;
              const displayName = user.clientProfile?.fullName ?? user.technicianProfile?.displayName ?? user.email;
              const avatarUrl =
                user.role.code === "CLIENT"
                  ? user.clientProfile?.avatarUrl
                  : user.role.code === "TECHNICIAN"
                    ? user.technicianProfile?.avatarUrl
                    : null;

              return (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 text-slate-700">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={displayName} src={avatarUrl} size={30} />
                      <span className="max-w-[220px] truncate">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-slate-700">{user.role.code}</td>
                  <td className="px-2 py-2 text-slate-700">
                    {displayName}
                  </td>
                  <td className="px-2 py-2">
                    <Badge variant={user.isEmailVerified ? "success" : "warning"}>{user.isEmailVerified ? "Sí" : "No"}</Badge>
                  </td>
                  <td className="px-2 py-2">
                    {verificationStatus ? (
                      <Badge variant={getVerificationColor(verificationStatus)}>
                        {getVerificationLabel(verificationStatus)}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {user.role.code === "TECHNICIAN" && user.technicianProfile ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={getSubscriptionPlanBadgeVariant(user.technicianProfile.subscriptionPlan)}>
                          {getSubscriptionPlanLabel(user.technicianProfile.subscriptionPlan)}
                        </Badge>
                        <Badge variant={getSubscriptionStatusBadgeVariant(user.technicianProfile.subscriptionStatus)}>
                          {getSubscriptionStatusLabel(user.technicianProfile.subscriptionStatus)}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>
                  </td>
                  <td className="px-2 py-2 text-slate-500">{new Date(user.createdAt).toLocaleDateString("es-NI")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  );
}
