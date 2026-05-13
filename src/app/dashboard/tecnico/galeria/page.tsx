import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { technicianDashboardLinks } from "@/lib/dashboard-links";

export default async function TecnicoGaleriaPage() {
  const user = await requirePageRole("TECHNICIAN");

  const gallery = (user.technicianProfile?.galleryJson as Array<{ url: string; caption?: string }> | null) ?? [];

  return (
    <DashboardShell
      title="Galería de trabajos"
      subtitle="Muestra evidencia visual de tus servicios para generar confianza."
      links={[...technicianDashboardLinks]}
    >
      <Card>
        <p className="text-sm text-slate-600">Total de imágenes registradas: {gallery.length}</p>
        <p className="mt-2 text-xs text-slate-500">
          El MVP deja preparada esta sección para integrar carga local o Cloudinary.
        </p>
      </Card>
    </DashboardShell>
  );
}
