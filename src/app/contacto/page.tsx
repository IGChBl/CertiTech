import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

export default function ContactoPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-12 md:px-6">
      <SectionTitle title="Contacto" subtitle="Estamos listos para ayudarte a crecer con CertiTech." />

      <Card className="space-y-3">
        <p className="text-sm text-slate-600">Correo: soporte@certitech.app</p>
        <p className="text-sm text-slate-600">Telefono: +505 8888-0000</p>
        <p className="text-sm text-slate-600">Horario de atencion: Lunes a viernes, 8:00 - 17:00</p>
      </Card>
    </div>
  );
}

