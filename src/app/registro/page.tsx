import { RegisterTabs } from "@/components/forms/auth-forms";
import { prisma } from "@/lib/prisma";

export default async function RegistroPage() {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="px-4 py-12 md:px-6">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Crea tu cuenta en CertiTech</h1>
        <p className="mt-2 text-slate-600">Elige tu tipo de perfil y empieza a conectar hoy mismo.</p>
      </div>
      <RegisterTabs categories={categories} />
    </div>
  );
}

