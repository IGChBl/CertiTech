import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

export default function FaqPage() {
  const faqs = [
    {
      q: "Como se seleccionan los tecnicos?",
      a: "Cada tecnico construye su reputacion con valoraciones reales, experiencia y estado de verificacion.",
    },
    {
      q: "Puedo publicar una solicitud sin elegir tecnico?",
      a: "Si. Puedes publicar abierta para que tecnicos de esa categoria la revisen.",
    },
    {
      q: "La plataforma cobra por usarla?",
      a: "El registro y la busqueda son gratuitos en este MVP. Las condiciones comerciales pueden evolucionar.",
    },
    {
      q: "Como reporto un problema?",
      a: "Desde tu dashboard puedes crear reportes para que el equipo admin modere el caso.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-12 md:px-6">
      <SectionTitle title="Preguntas frecuentes" subtitle="Todo lo que necesitas saber para usar CertiTech." />
      <div className="space-y-3">
        {faqs.map((faq) => (
          <Card key={faq.q}>
            <h3 className="text-base font-semibold text-slate-900">{faq.q}</h3>
            <p className="mt-2 text-sm text-slate-600">{faq.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

