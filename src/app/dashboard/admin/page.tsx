import Link from "next/link";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getAdminMetrics } from "@/lib/admin/metrics";

export default async function AdminDashboardPage() {
  await requirePageRole("ADMIN");

  const metrics = await getAdminMetrics();

  return (
    <DashboardShell
      title="Panel administrativo"
      subtitle="Vista general de operación y calidad de la plataforma."
      links={[...adminDashboardLinks]}
    >
      {metrics.hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total usuarios", value: metrics.totalUsers },
          { label: "Clientes", value: metrics.totalClients },
          { label: "Técnicos", value: metrics.totalTechnicians },
          { label: "Suscripciones activas", value: metrics.activeSubscriptions },
          { label: "Solicitudes", value: metrics.totalRequests },
          { label: "Servicios completados", value: metrics.completedRequests },
          { label: "Chats", value: metrics.totalChats },
          { label: "Reseñas", value: metrics.totalReviews },
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
          {metrics.topTechnicians.map((tech) => (
            <div key={tech.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <UserAvatar name={tech.name} src={tech.avatarUrl} size={30} />
                <p className="text-sm font-medium text-slate-900">{tech.name}</p>
              </div>
              <p className="text-xs text-slate-500">
                {tech.rating.toFixed(1)} estrellas ({tech.reviews})
              </p>
            </div>
          ))}
          {!metrics.topTechnicians.length ? <p className="text-sm text-slate-600">Sin datos suficientes aún.</p> : null}
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
