import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";

export default async function AdminDashboardPage() {
  await requirePageRole("ADMIN");

  const [users, clients, technicians, activeSubscriptions, requests, completed, chats, reviews] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: { code: "CLIENT" } } }),
    prisma.user.count({ where: { role: { code: "TECHNICIAN" } } }),
    prisma.technicianProfile.count({
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionPlan: { in: ["MONTHLY", "YEARLY"] },
      },
    }),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: "COMPLETED" } }),
    prisma.chat.count(),
    prisma.review.count(),
  ]);

  const topTechs = await prisma.technicianProfile.findMany({
    where: { totalReviews: { gt: 0 } },
    orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
    take: 5,
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      averageRating: true,
      totalReviews: true,
    },
  });

  return (
    <DashboardShell
      title="Panel administrativo"
      subtitle="Vista general de operación y calidad de la plataforma."
      links={[...adminDashboardLinks]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total usuarios", value: users },
          { label: "Clientes", value: clients },
          { label: "Técnicos", value: technicians },
          { label: "Suscripciones activas", value: activeSubscriptions },
          { label: "Solicitudes", value: requests },
          { label: "Servicios completados", value: completed },
          { label: "Chats", value: chats },
          { label: "Reseñas", value: reviews },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Técnicos mejor valorados</h2>
        <div className="space-y-2">
          {topTechs.map((tech) => (
            <div key={tech.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <UserAvatar name={tech.displayName} src={tech.avatarUrl} size={30} />
                <p className="text-sm font-medium text-slate-900">{tech.displayName}</p>
              </div>
              <p className="text-xs text-slate-500">
                {tech.averageRating.toFixed(1)} estrellas ({tech.totalReviews})
              </p>
            </div>
          ))}
          {!topTechs.length ? <p className="text-sm text-slate-600">Sin datos suficientes aún.</p> : null}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-slate-600">
          También puedes consultar las rutas API administrativas para integración externa y analítica avanzada.
        </p>
        <Link href="/api/admin/metrics" className="mt-2 inline-block text-sm font-semibold text-slate-900 underline">
          Ver JSON de métricas
        </Link>
      </Card>
    </DashboardShell>
  );
}
