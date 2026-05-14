import { RegisterTabs } from "@/components/forms/auth-forms";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

export default async function RegistroPage() {
  const { categories, hasWarning } = await (async () => {
    try {
      const data = await prisma.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });

      return { categories: data, hasWarning: false };
    } catch (error) {
      console.error("[public][registro] Error cargando categorías de registro", error);
      return { categories: [], hasWarning: true };
    }
  })();

  return (
    <div className="px-4 py-12 md:px-6">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Crea tu cuenta en CertiTech</h1>
        <p className="mt-2 text-slate-600">Elige tu tipo de perfil y empieza a conectar hoy mismo.</p>
      </div>
      {hasWarning ? (
        <Card className="mx-auto mb-6 w-full max-w-3xl">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}
      <RegisterTabs categories={categories} />
    </div>
  );
}

