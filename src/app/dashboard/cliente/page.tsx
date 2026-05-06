import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuracion" },
];

export default async function ClienteDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ email_notice?: string }>;
}) {
  const params = await searchParams;
  const user = await requirePageRole("CLIENT");
  const clientStatus = user.clientProfile?.verificationStatus ?? "PENDING";
  const emailVerified = user.isEmailVerified;
  const hasLimitedAccess =
    !emailVerified || (clientStatus !== "BASIC_VERIFIED" && clientStatus !== "VERIFIED");
  const alertMessage =
    clientStatus === "REJECTED"
      ? "Tu verificacion fue rechazada. Revisa el motivo y actualiza tu informacion para solicitar una nueva revision."
      : "Tu cuenta esta pendiente de verificacion. Algunas funciones estaran limitadas hasta completar el proceso.";
  const showEmailDeliveryWarning = params.email_notice === "delivery_failed";

  const [requestsCount, favoritesCount, chatsCount, reviewsCount] = await Promise.all([
    prisma.serviceRequest.count({ where: { clientId: user.id } }),
    prisma.favorite.count({ where: { clientId: user.id } }),
    prisma.chatParticipant.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { clientId: user.id } }),
  ]);

  return (
    <DashboardShell
      title={`Hola, ${user.clientProfile?.fullName ?? "cliente"}`}
      subtitle="Administra tus solicitudes, conversaciones y tecnicos favoritos."
      links={clientLinks}
    >
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Si" : "No"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Estado de verificacion:</p>
          <Badge variant={getVerificationColor(clientStatus)}>{getVerificationLabel(clientStatus)}</Badge>
        </div>
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Debes verificar tu correo para habilitar funciones clave de la cuenta.
          </p>
        ) : null}
        {showEmailDeliveryWarning ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu cuenta fue creada, pero no se pudo enviar el correo de verificacion. Usa el boton de reenvio.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        {hasLimitedAccess ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{alertMessage}</p>
        ) : (
          <p className="text-sm text-slate-600">Tu cuenta cumple validaciones minimas para contratar servicios.</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Solicitudes", value: requestsCount },
          { label: "Favoritos", value: favoritesCount },
          { label: "Chats", value: chatsCount },
          { label: "Resenas escritas", value: reviewsCount },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
