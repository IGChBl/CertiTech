import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ email_notice?: string }>;
}) {
  const params = await searchParams;
  const user = await requirePageRole("TECHNICIAN");
  const verificationStatus = user.technicianProfile?.verification ?? "PENDING";
  const isVerified = verificationStatus === "VERIFIED";
  const emailVerified = user.isEmailVerified;
  const showEmailDeliveryWarning = params.email_notice === "delivery_failed";

  const [assigned, completed, reviews, pendingRequests] = await Promise.all([
    prisma.serviceRequest.count({ where: { technicianId: user.id } }),
    prisma.serviceRequest.count({ where: { technicianId: user.id, status: "COMPLETED" } }),
    prisma.review.count({
      where: {
        technicianProfileId: user.technicianProfile?.id,
      },
    }),
    prisma.serviceRequest.count({
      where: {
        technicianId: null,
        status: "PENDING",
        categoryId: {
          in: isVerified && user.technicianProfile
            ? (
                await prisma.technicianService.findMany({
                  where: { technicianId: user.technicianProfile.id },
                  select: { categoryId: true },
                })
              ).map((service) => service.categoryId)
            : [],
        },
      },
    }),
  ]);

  return (
    <DashboardShell
      title={`Panel tecnico: ${user.technicianProfile?.displayName ?? user.email}`}
      subtitle="Gestiona solicitudes, conversaciones y reputacion desde un solo lugar."
      links={technicianLinks}
    >
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Correo verificado:</p>
          <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Si" : "No"}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700">Estado de verificacion:</p>
          <Badge variant={getVerificationColor(verificationStatus)}>{getVerificationLabel(verificationStatus)}</Badge>
        </div>
        {!emailVerified ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Debes verificar tu correo para habilitar publicaciones y contrataciones tecnicas.
          </p>
        ) : null}
        {showEmailDeliveryWarning ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu cuenta fue creada, pero no se pudo enviar el correo de verificacion. Usa el boton de reenvio.
          </p>
        ) : null}
        {!emailVerified ? <ResendVerificationButton /> : null}
        {!isVerified && verificationStatus !== "REJECTED" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Tu perfil esta en revision. Podras aparecer en busquedas y recibir solicitudes cuando sea aprobado por
            CertiTech.
          </p>
        ) : null}
        {verificationStatus === "REJECTED" ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Tu verificacion fue rechazada. Revisa el motivo y actualiza tu informacion para solicitar una nueva
            revision.
          </p>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Solicitudes asignadas", value: assigned },
          { label: "Trabajos completados", value: completed },
          { label: "Valoraciones", value: reviews },
          { label: "Solicitudes disponibles", value: pendingRequests },
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
