import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 md:px-6">
      <SectionTitle
        title="Como funciona CertiTech"
        subtitle="Un flujo claro para conectar clientes con tecnicos confiables en minutos."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Publica o busca",
            text: "Crea una solicitud o busca tecnicos por categoria, ciudad y reputacion.",
          },
          {
            title: "Compara perfiles",
            text: "Revisa experiencia, servicios, precios referenciales y verificacion.",
          },
          {
            title: "Coordina por chat",
            text: "Habla directo con el tecnico, comparte detalles y define fecha.",
          },
          {
            title: "Califica el resultado",
            text: "Al terminar, deja tu valoracion y ayuda a la comunidad.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

