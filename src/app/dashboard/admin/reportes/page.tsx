import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { ReportStatusForm } from "@/components/forms/report-status-form";

const adminLinks = [
  { href: "/dashboard/admin", label: "Resumen" },
  { href: "/dashboard/admin/usuarios", label: "Usuarios" },
  { href: "/dashboard/admin/tecnicos", label: "Tecnicos" },
  { href: "/dashboard/admin/categorias", label: "Categorias" },
  { href: "/dashboard/admin/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/admin/reportes", label: "Reportes" },
  { href: "/dashboard/admin/resenas", label: "Resenas" },
  { href: "/dashboard/admin/moderacion", label: "Moderacion" },
];

export default async function AdminReportesPage() {
  await requirePageRole("ADMIN");

  const reports = await prisma.report.findMany({
    include: {
      reporter: {
        include: {
          clientProfile: true,
          technicianProfile: true,
        },
      },
      reportedUser: {
        include: {
          clientProfile: true,
          technicianProfile: true,
        },
      },
      reportedTechnician: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Gestion de reportes" subtitle="Seguridad comunitaria y moderacion de casos." links={adminLinks}>
      <div className="space-y-3">
        {reports.map((report) => (
          <Card key={report.id} className="space-y-3">
            <p className="font-semibold text-slate-900">Motivo: {report.reason}</p>
            <p className="text-sm text-slate-600">Detalle: {report.details}</p>
            <p className="text-xs text-slate-500">
              Reportado por: {report.reporter.clientProfile?.fullName ?? report.reporter.email}
            </p>
            <ReportStatusForm reportId={report.id} currentStatus={report.status} />
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
