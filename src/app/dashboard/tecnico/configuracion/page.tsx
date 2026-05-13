import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { AvatarUploader } from "@/components/forms/avatar-uploader";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoConfiguracionPage() {
  const user = await requirePageRole("TECHNICIAN");
  const status = user.technicianProfile?.verification ?? "PENDING";
  const isVerified = status === "VERIFIED";
  const emailVerified = user.isEmailVerified;

  return (
    <DashboardShell title="Configuracion tecnica" subtitle="Administra tu perfil publico profesional." links={technicianLinks}>
      <Card className="space-y-2">
        <AvatarUploader
          displayName={user.technicianProfile?.displayName}
          currentAvatarUrl={user.technicianProfile?.avatarUrl}
          subtitle="Tu foto sera visible en tarjetas, perfil publico y paneles internos."
        />
        <p className="text-sm text-slate-600">Nombre: {user.technicianProfile?.displayName}</p>
        <p className="text-sm text-slate-600">Correo: {user.email}</p>
        <p className="text-sm text-slate-600">Ciudad: {user.technicianProfile?.city}</p>
        <p className="text-sm text-slate-600">Zona: {user.technicianProfile?.workZone}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-600">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Si" : "No"}</Badge>
        </div>
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu correo aun no esta verificado. Revisa tu bandeja o reenvia el correo.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        <Badge variant={getVerificationColor(status)}>Estado: {getVerificationLabel(status)}</Badge>
        {!isVerified && status !== "REJECTED" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu perfil esta en revision. Podras aparecer en busquedas y recibir solicitudes cuando sea aprobado por
            CertiTech.
          </p>
        ) : null}
        {status === "REJECTED" ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Tu verificacion fue rechazada. Revisa el motivo y actualiza tu informacion para solicitar una nueva
            revision.
          </p>
        ) : null}
        {status === "REJECTED" && user.technicianProfile?.rejectionReason ? (
          <p className="text-sm text-rose-700">Motivo de rechazo: {user.technicianProfile.rejectionReason}</p>
        ) : null}
      </Card>
    </DashboardShell>
  );
}
