import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoTrabajosPage() {
  const user = await requirePageRole("TECHNICIAN");

  const jobs = await prisma.serviceRequest.findMany({
    where: {
      technicianId: user.id,
      status: {
        in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"],
      },
    },
    include: {
      client: {
        include: {
          clientProfile: true,
        },
      },
      category: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <DashboardShell title="Mis trabajos" subtitle="Seguimiento de servicios aceptados y completados." links={technicianLinks}>
      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{job.title}</p>
              <Badge variant={job.status === "COMPLETED" ? "success" : "neutral"}>{job.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Cliente: {job.client.clientProfile?.fullName ?? job.client.email}
            </p>
            <p className="text-sm text-slate-600">Categoria: {job.category.name}</p>
            {job.review ? <p className="mt-2 text-xs text-slate-500">Ya tiene valoracion registrada.</p> : null}
          </Card>
        ))}
      </div>
      {!jobs.length ? <Card>Aun no tienes trabajos en curso.</Card> : null}
    </DashboardShell>
  );
}
