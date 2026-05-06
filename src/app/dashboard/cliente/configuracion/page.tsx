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

export default async function ClienteConfiguracionPage() {
  const user = await requirePageRole("CLIENT");
  const status = user.clientProfile?.verificationStatus ?? "PENDING";
  const emailVerified = user.isEmailVerified;
  const infoMessage =
    status === "REJECTED"
      ? "Tu verificacion fue rechazada. Revisa el motivo y actualiza tu informacion para solicitar una nueva revision."
      : "Tu cuenta esta pendiente de verificacion. Algunas funciones estaran limitadas hasta completar el proceso.";

  return (
    <DashboardShell title="Configuracion" subtitle="Gestiona tus datos personales y preferencias." links={clientLinks}>
      <Card className="space-y-2">
        <p className="text-sm text-slate-600">Nombre: {user.clientProfile?.fullName}</p>
        <p className="text-sm text-slate-600">Correo: {user.email}</p>
        <p className="text-sm text-slate-600">Telefono: {user.phone ?? "No definido"}</p>
        <p className="text-sm text-slate-600">Ciudad: {user.clientProfile?.city}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-600">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Si" : "No"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-600">Estado:</p>
          <Badge variant={getVerificationColor(status)}>{getVerificationLabel(status)}</Badge>
        </div>
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu correo aun no esta verificado. Revisa tu bandeja o reenvia el correo.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        {status !== "VERIFIED" && status !== "BASIC_VERIFIED" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{infoMessage}</p>
        ) : null}
        {status === "REJECTED" && user.clientProfile?.rejectionReason ? (
          <p className="text-sm text-rose-700">Motivo de rechazo: {user.clientProfile.rejectionReason}</p>
        ) : null}
      </Card>
    </DashboardShell>
  );
}
