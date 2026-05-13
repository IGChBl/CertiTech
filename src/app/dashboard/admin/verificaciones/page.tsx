import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { adminDashboardLinks } from "@/lib/dashboard-links";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminVerificationActions } from "@/components/forms/admin-verification-actions";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { UserAvatar } from "@/components/ui/user-avatar";

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function formatDate(value: Date | null) {
  if (!value) return "No definido";
  return new Date(value).toLocaleDateString("es-NI");
}

export default async function AdminVerificacionesPage() {
  await requirePageRole("ADMIN");

  const [clients, technicians] = await Promise.all([
    prisma.clientProfile.findMany({
      where: {
        verificationStatus: {
          in: ["PENDING", "BASIC_VERIFIED", "REJECTED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            birthDate: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.technicianProfile.findMany({
      where: {
        verification: {
          in: ["PENDING", "IN_REVIEW", "REJECTED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            birthDate: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        services: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        verificationRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        verifiedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <DashboardShell
      title="Verificaciones"
      subtitle="Aprueba o rechaza clientes y tecnicos para fortalecer confianza y seguridad."
      links={[...adminDashboardLinks]}
    >
      <Card className="space-y-2">
        <p className="text-sm text-slate-600">Clientes por revisar: {clients.length}</p>
        <p className="text-sm text-slate-600">Tecnicos por revisar: {technicians.length}</p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Clientes</h2>
        {clients.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {clients.map((client) => (
              <Card key={client.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={client.fullName} src={client.avatarUrl} size={36} />
                    <p className="text-base font-semibold text-slate-900">{client.fullName}</p>
                  </div>
                  <Badge variant={getVerificationColor(client.verificationStatus)}>
                    {getVerificationLabel(client.verificationStatus)}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>Correo: {client.user.email}</p>
                  <p>Telefono: {client.user.phone ?? "No definido"}</p>
                  <p>Ciudad/Zona: {client.city}{client.zone ? ` - ${client.zone}` : ""}</p>
                  <p>Nacimiento: {formatDate(client.user.birthDate)}</p>
                  <p>Correo verificado: {client.user.isEmailVerified ? "Si" : "No"}</p>
                  <p>Cedula: {client.identityDocumentNumber ?? "No registrada"}</p>
                  <p>Ultima revision: {formatDate(client.verifiedAt)}</p>
                  <p>Revisado por: {client.verifiedBy?.email ?? "Sin asignar"}</p>
                </div>

                {client.rejectionReason ? (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    Motivo de rechazo: {client.rejectionReason}
                  </p>
                ) : null}

                <AdminVerificationActions
                  targetType="CLIENT"
                  profileId={client.id}
                  currentStatus={client.verificationStatus}
                  allowedStatuses={["PENDING", "BASIC_VERIFIED", "VERIFIED", "REJECTED"]}
                  initialReason={client.rejectionReason}
                  initialNote={client.verificationNote}
                />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-slate-600">No hay clientes pendientes de verificacion.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Tecnicos</h2>
        {technicians.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {technicians.map((tech) => {
              const workEvidence = asStringArray(tech.workEvidenceJson);
              const certifications = asStringArray(tech.certificationsJson);
              const latestRequest = tech.verificationRequests[0];

              return (
                <Card key={tech.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={tech.displayName} src={tech.avatarUrl} size={36} />
                      <p className="text-base font-semibold text-slate-900">{tech.displayName}</p>
                    </div>
                    <Badge variant={getVerificationColor(tech.verification)}>{getVerificationLabel(tech.verification)}</Badge>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Negocio: {tech.businessName ?? "Independiente"}</p>
                    <p>Correo: {tech.user.email}</p>
                    <p>Telefono: {tech.user.phone ?? "No definido"}</p>
                    <p>
                      Ciudad/Zona: {tech.city}
                      {tech.workZone ? ` - ${tech.workZone}` : ""}
                    </p>
                    <p>Nacimiento: {formatDate(tech.user.birthDate)}</p>
                    <p>Correo verificado: {tech.user.isEmailVerified ? "Si" : "No"}</p>
                    <p>Anios de experiencia: {tech.yearsExperience}</p>
                    <p>Categorias: {tech.services.map((service) => service.category.name).join(", ") || "Sin categorias"}</p>
                    <p>Documento: {tech.identityDocumentUrl ? "Cargado" : "No cargado"}</p>
                    <p>Evidencias: {workEvidence.length}</p>
                    <p>Certificaciones: {certifications.length}</p>
                    <p>Record policial: {tech.policeRecordUrl ? "Cargado" : "No cargado"}</p>
                    <p>Ultima revision: {formatDate(tech.verifiedAt)}</p>
                    <p>Revisado por: {tech.verifiedBy?.email ?? "Sin asignar"}</p>
                    <p>Solicitud verificacion: {latestRequest?.status ?? "No existe"}</p>
                  </div>

                  {tech.identityDocumentUrl ? (
                    <a href={tech.identityDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-700 underline">
                      Ver documento de identidad
                    </a>
                  ) : null}

                  {workEvidence.length ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Evidencias de trabajo</p>
                      <div className="space-y-1">
                        {workEvidence.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs text-slate-700 underline">
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {certifications.length ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-700">Certificaciones</p>
                      <div className="space-y-1">
                        {certifications.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs text-slate-700 underline">
                            {url}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {tech.rejectionReason ? (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      Motivo de rechazo: {tech.rejectionReason}
                    </p>
                  ) : null}

                  <AdminVerificationActions
                    targetType="TECHNICIAN"
                    profileId={tech.id}
                    currentStatus={tech.verification}
                    allowedStatuses={["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED"]}
                    initialReason={tech.rejectionReason}
                    initialNote={tech.verificationNote}
                  />
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-slate-600">No hay tecnicos pendientes de verificacion.</p>
          </Card>
        )}
      </section>
    </DashboardShell>
  );
}
