import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceRequestForm } from "@/components/forms/service-request-form";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuracion" },
];

export default async function ClienteSolicitudesPage() {
  const user = await requirePageRole("CLIENT");

  const [categories, technicians, requests] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.technicianProfile.findMany({
      where: { user: { status: "ACTIVE" } },
      orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
      take: 20,
      select: { userId: true, displayName: true, businessName: true },
    }),
    prisma.serviceRequest.findMany({
      where: { clientId: user.id },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <DashboardShell
      title="Mis solicitudes"
      subtitle="Publica nuevas necesidades y monitorea su estado de contratacion."
      links={clientLinks}
    >
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear solicitud</h2>
        <ServiceRequestForm
          categories={categories}
          technicians={technicians.map((item) => ({
            userId: item.userId,
            label: item.businessName ? `${item.displayName} - ${item.businessName}` : item.displayName,
          }))}
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Historial</h2>
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{request.title}</p>
                <Badge variant="neutral">{request.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">{request.category.name}</p>
              <p className="text-xs text-slate-500">{request.city}</p>
            </div>
          ))}
          {!requests.length ? <p className="text-sm text-slate-600">Aun no has publicado solicitudes.</p> : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
