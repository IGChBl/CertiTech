import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/forms/resend-verification-button";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { AvatarUploader } from "@/components/forms/avatar-uploader";
import { prisma } from "@/lib/prisma"; // 💡 Importamos prisma para jalar las categorías
import { BecomeTechnician } from "@/components/dashboard/BecomeTechnician"; // 💡 Importamos el banner dual

const clientLinks = [
    { href: "/dashboard/cliente", label: "Resumen" },
    { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
    { href: "/dashboard/cliente/chats", label: "Mis chats" },
    { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
    { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
    { href: "/dashboard/cliente/configuracion", label: "Configuración" },
];

export default async function ClienteConfiguracionPage() {
    const user = await requirePageRole("CLIENT");
    const status = user.clientProfile?.verificationStatus ?? "PENDING";
    const emailVerified = user.isEmailVerified;
    const infoMessage =
        status === "REJECTED"
            ? "Tu verificación fue rechazada. Revisa el motivo y actualiza tu información para solicitar una nueva revisión."
            : "Tu cuenta está pendiente de verificación. Algunas funciones estarán limitadas hasta completar el proceso.";

    // 💡 LÓGICA DUAL: Si no tiene perfil técnico, cargamos las categorías desde la BD
    const hasTechnician = !!user.technicianProfile;
    const categories = !hasTechnician
        ? await prisma.serviceCategory.findMany({ select: { id: true, name: true } })
        : [];

    return (
        <DashboardShell title="Configuración" subtitle="Gestiona tus datos personales y preferencias." links={clientLinks}>
            <div className="space-y-6"> {/* Envolvemos en un div para manejar separación limpia */}

                {/* Tarjeta de Datos Personales */}
                <Card className="space-y-2">
                    <AvatarUploader
                        displayName={user.clientProfile?.fullName}
                        currentAvatarUrl={user.clientProfile?.avatarUrl}
                        subtitle="Tu foto se usara en dashboard, chats, solicitudes y reseñas."
                    />
                    <p className="text-sm text-slate-600">Nombre: {user.clientProfile?.fullName}</p>
                    <p className="text-sm text-slate-600">Correo: {user.email}</p>
                    <p className="text-sm text-slate-600">Teléfono: {user.phone ?? "No definido"}</p>
                    <p className="text-sm text-slate-600">Ciudad: {user.clientProfile?.city}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-slate-600">Correo verificado:</p>
                        <Badge variant={emailVerified ? "success" : "warning"}>{emailVerified ? "Sí" : "No"}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-slate-600">Estado:</p>
                        <Badge variant={getVerificationColor(status)}>{getVerificationLabel(status)}</Badge>
                    </div>
                    {!emailVerified ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            Tu correo aún no está verificado. Revisa tu bandeja o reenvía el correo.
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

                {/* 💡 SECCIÓN DUAL: Si el usuario NO tiene un perfil de técnico aún, renderizamos el banner */}
                {!hasTechnician && (
                    <BecomeTechnician categories={categories} />
                )}
            </div>
        </DashboardShell>
    );
}