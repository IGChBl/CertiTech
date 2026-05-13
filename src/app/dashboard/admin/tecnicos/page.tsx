import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { UserAvatar } from "@/components/ui/user-avatar";

export default async function AdminTecnicosPage() {
  await requirePageRole("ADMIN");

  const technicians = await prisma.technicianProfile.findMany({
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell
      title="Gestion de tecnicos"
      subtitle="Verificacion, reputacion y estado operativo."
      links={[...adminDashboardLinks]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {technicians.map((tech) => (
          <Card key={tech.id}>
            <div className="mb-2 flex items-center gap-3">
              <UserAvatar name={tech.displayName} src={tech.avatarUrl} size={44} />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{tech.displayName}</h3>
                <p className="text-sm text-slate-600">{tech.businessName ?? tech.user.email}</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">{tech.city}</p>
            <p className="mt-1 text-xs text-slate-500">
              Correo verificado: {tech.user.isEmailVerified ? "Si" : "No"}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant={getVerificationColor(tech.verification)}>{getVerificationLabel(tech.verification)}</Badge>
              <p className="text-xs text-slate-500">{tech.averageRating.toFixed(1)} estrellas</p>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
