import Link from "next/link";
import { Card } from "@/components/ui/card";
import { verifyEmailToken } from "@/lib/services/email-verification";

type SearchParams = Promise<{
  token?: string;
  status?: string;
}>;

function getMessageFromStatus(status: string) {
  if (status === "success") {
    return {
      title: "Correo verificado",
      body: "Tu correo fue confirmado correctamente. Ya puedes continuar en CertiTech.",
      tone: "success" as const,
    };
  }

  if (status === "expired") {
    return {
      title: "Enlace expirado",
      body: "El enlace de verificación ya expiró. Solicita un nuevo correo de verificación.",
      tone: "warning" as const,
    };
  }

  if (status === "missing-token") {
    return {
      title: "Token faltante",
      body: "No encontramos un token de verificación en el enlace.",
      tone: "warning" as const,
    };
  }

  return {
    title: "Token inválido",
    body: "El enlace de verificación no es válido o ya fue utilizado.",
    tone: "warning" as const,
  };
}

export default async function VerificarCorreoPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  let status = params.status ?? "";

  if (!status && params.token) {
    const result = await verifyEmailToken(params.token);
    status = result.ok ? "success" : result.reason;
  }

  const message = getMessageFromStatus(status || "invalid");
  const isSuccess = message.tone === "success";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 md:px-6">
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{message.title}</h1>
        <p className={isSuccess ? "text-emerald-700" : "text-amber-800"}>{message.body}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Ir a iniciar sesión
          </Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
            Volver al inicio
          </Link>
        </div>
      </Card>
    </div>
  );
}
