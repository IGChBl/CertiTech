import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { UserAvatar } from "@/components/ui/user-avatar";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuración" },
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
      ? "Tu verificación fue rechazada. Revisa el motivo y actualiza tu información para solicitar una nueva revisión."
      : "Tu cuenta está pendiente de verificación. Algunas funciones estarán limitadas hasta completar el proceso.";
  const showEmailDeliveryWarning = params.email_notice === "delivery_failed";

  let requestsCount = 0;
  let favoritesCount = 0;
  let chatsCount = 0;
  let reviewsCount = 0;
  let hasWarning = false;

  try {
    [requestsCount, favoritesCount, chatsCount, reviewsCount] = await prisma.$transaction([
      prisma.serviceRequest.count({ where: { clientId: user.id } }),
      prisma.favorite.count({ where: { clientId: user.id } }),
      prisma.chatParticipant.count({ where: { userId: user.id } }),
      prisma.review.count({ where: { clientId: user.id } }),
    ]);
  } catch (error) {
    console.error("[dashboard][cliente] Error cargando métricas", error);
    hasWarning = true;
  }

  return (
    <DashboardShell
      title={`Hola, ${user.clientProfile?.fullName ?? "cliente"}`}
      subtitle="Administra tus solicitudes, conversaciones y técnicos favoritos."
      links={clientLinks}
    >
      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <div className="flex items-center gap-3 pb-1">
          <UserAvatar
            name={user.clientProfile?.fullName}
            src={user.clientProfile?.avatarUrl}
            size={52}
            className="ring-2 ring-white"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">{user.clientProfile?.fullName ?? "Cliente"}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Sí" : "No"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Estado de verificación:</p>
          <Badge variant={getVerificationColor(clientStatus)}>{getVerificationLabel(clientStatus)}</Badge>
        </div>
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Debes verificar tu correo para habilitar funciones clave de la cuenta.
          </p>
        ) : null}
        {showEmailDeliveryWarning ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu cuenta fue creada, pero no se pudo enviar el correo de verificación. Usa el botón de reenvío.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        {hasLimitedAccess ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{alertMessage}</p>
        ) : (
          <p className="text-sm text-slate-600">Tu cuenta cumple validaciones mínimas para contratar servicios.</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Solicitudes", value: requestsCount },
          { label: "Favoritos", value: favoritesCount },
          { label: "Chats", value: chatsCount },
          { label: "Reseñas escritas", value: reviewsCount },
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
