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

export default async function TecnicoConfiguracionPage() {
  const user = await requirePageRole("TECHNICIAN");

  return (
    <DashboardShell title="Configuracion tecnica" subtitle="Administra tu perfil publico profesional." links={technicianLinks}>
      <Card className="space-y-2">
        <p className="text-sm text-slate-600">Nombre: {user.technicianProfile?.displayName}</p>
        <p className="text-sm text-slate-600">Correo: {user.email}</p>
        <p className="text-sm text-slate-600">Ciudad: {user.technicianProfile?.city}</p>
        <p className="text-sm text-slate-600">Zona: {user.technicianProfile?.workZone}</p>
        <Badge variant={user.technicianProfile?.verification === "VERIFIED" ? "success" : "warning"}>
          Estado: {user.technicianProfile?.verification}
        </Badge>
      </Card>
    </DashboardShell>
  );
}
