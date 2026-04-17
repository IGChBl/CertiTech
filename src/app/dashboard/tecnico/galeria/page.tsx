import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoGaleriaPage() {
  const user = await requirePageRole("TECHNICIAN");

  const gallery = (user.technicianProfile?.galleryJson as Array<{ url: string; caption?: string }> | null) ?? [];

  return (
    <DashboardShell
      title="Galeria de trabajos"
      subtitle="Muestra evidencia visual de tus servicios para generar confianza."
      links={technicianLinks}
    >
      <Card>
        <p className="text-sm text-slate-600">Total de imagenes registradas: {gallery.length}</p>
        <p className="mt-2 text-xs text-slate-500">
          El MVP deja preparada esta seccion para integrar carga local o Cloudinary.
        </p>
      </Card>
    </DashboardShell>
  );
}
