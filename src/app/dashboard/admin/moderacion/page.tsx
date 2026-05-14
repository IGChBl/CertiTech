import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

export default async function AdminModeracionPage() {
  await requirePageRole("ADMIN");

  let reportsOpen = 0;
  let verificationPending = 0;
  let hasWarning = false;

  try {
    [reportsOpen, verificationPending] = await prisma.$transaction([
      prisma.report.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    ]);
  } catch (error) {
    console.error("[dashboard][admin][moderacion] Error cargando métricas", error);
    hasWarning = true;
  }

  return (
    <DashboardShell
      title="Moderacion"
      subtitle="Centro de control para seguridad comunitaria."
      links={[...adminDashboardLinks]}
    >
      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-500">Reportes pendientes</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{reportsOpen}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Verificaciones pendientes</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{verificationPending}</p>
        </Card>
      </div>
    </DashboardShell>
  );
}
