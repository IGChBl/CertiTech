import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

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

export default async function AdminModeracionPage() {
  await requirePageRole("ADMIN");

  const [reportsOpen, verificationPending] = await Promise.all([
    prisma.report.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.verificationRequest.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <DashboardShell title="Moderacion" subtitle="Centro de control para seguridad comunitaria." links={adminLinks}>
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
