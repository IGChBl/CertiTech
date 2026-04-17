import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuracion" },
];

export default async function ClienteConfiguracionPage() {
  const user = await requirePageRole("CLIENT");

  return (
    <DashboardShell title="Configuracion" subtitle="Gestiona tus datos personales y preferencias." links={clientLinks}>
      <Card>
        <p className="text-sm text-slate-600">Nombre: {user.clientProfile?.fullName}</p>
        <p className="text-sm text-slate-600">Correo: {user.email}</p>
        <p className="text-sm text-slate-600">Telefono: {user.phone ?? "No definido"}</p>
        <p className="text-sm text-slate-600">Ciudad: {user.clientProfile?.city}</p>
      </Card>
    </DashboardShell>
  );
}
