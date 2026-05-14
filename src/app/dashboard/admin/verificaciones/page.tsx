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

  const { clients, technicians, hasWarning } = await (async () => {
    try {
      const [clientsData, techniciansData] = await Promise.all([
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

      return { clients: clientsData, technicians: techniciansData, hasWarning: false };
    } catch (error) {
      console.error("[admin][verificaciones] Error cargando verificaciones", error);
      return { clients: [], technicians: [], hasWarning: true };
    }
  })();

  return (
    <DashboardShell
      title="Verificaciones"
      subtitle="Aprueba o rechaza clientes y técnicos para fortalecer confianza y seguridad."
      links={[...adminDashboardLinks]}
    >
      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <p className="text-sm text-slate-600">Clientes por revisar: {clients.length}</p>
        <p className="text-sm text-slate-600">Técnicos por revisar: {technicians.length}</p>
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
                  <p>Teléfono: {client.user.phone ?? "No definido"}</p>
                  <p>Ciudad/Zona: {client.city}{client.zone ? ` - ${client.zone}` : ""}</p>
                  <p>Nacimiento: {formatDate(client.user.birthDate)}</p>
                  <p>Correo verificado: {client.user.isEmailVerified ? "Sí" : "No"}</p>
                  <p>Cédula: {client.identityDocumentNumber ?? "No registrada"}</p>
                  <p>Última revisión: {formatDate(client.verifiedAt)}</p>
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
            <p className="text-sm text-slate-600">No hay clientes pendientes de verificación.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Técnicos</h2>
        {technicians.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {technicians.map((tech) => {
              const workEvidence = asStringArray(tech.workEvidenceJson);
              const certifications = asStringArray(tech.certificationsJson);
              const latestRequest = tech.verificationRequests[0];
              const hasIdentityDocument = Boolean(tech.identityDocumentUrl);
              const hasPoliceRecord = Boolean(tech.policeRecordUrl?.trim());
              const hasEvidence = workEvidence.length > 0;
              const hasCertifications = certifications.length > 0;

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
                    <p>Teléfono: {tech.user.phone ?? "No definido"}</p>
                    <p>
                      Ciudad/Zona: {tech.city}
                      {tech.workZone ? ` - ${tech.workZone}` : ""}
                    </p>
                    <p>Nacimiento: {formatDate(tech.user.birthDate)}</p>
                    <p>Correo verificado: {tech.user.isEmailVerified ? "Sí" : "No"}</p>
                    <p>Años de experiencia: {tech.yearsExperience}</p>
                    <p>Categorías: {tech.services.map((service) => service.category.name).join(", ") || "Sin categorías"}</p>
                    <p>Documento: {hasIdentityDocument ? "Cargado" : "No cargado"}</p>
                    <p>Evidencias: {workEvidence.length}</p>
                    <p>Certificaciones: {certifications.length}</p>
                    <p>Récord policial: {hasPoliceRecord ? "Cargado" : "Pendiente"}</p>
                    <p>Última revisión: {formatDate(tech.verifiedAt)}</p>
                    <p>Revisado por: {tech.verifiedBy?.email ?? "Sin asignar"}</p>
                    <p>Solicitud verificación: {latestRequest?.status ?? "No existe"}</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Checklist de aprobación</p>
                    <p>{hasIdentityDocument ? "✓ Documento de identidad cargado" : "✗ Documento de identidad pendiente"}</p>
                    <p>{hasPoliceRecord ? "✓ Récord policial cargado" : "✗ Récord policial pendiente"}</p>
                    <p>{hasEvidence ? "✓ Evidencias de trabajo cargadas" : "✗ Evidencias de trabajo pendientes"}</p>
                    <p>{hasCertifications ? "✓ Certificaciones cargadas" : "✗ Certificaciones pendientes"}</p>
                  </div>

                  {tech.identityDocumentUrl ? (
                    <a href={tech.identityDocumentUrl} target="_blank" rel="noreferrer" className="text-xs text-slate-700 underline">
                      Ver documento de identidad
                    </a>
                  ) : null}

                  {hasPoliceRecord ? (
                    <a
                      href={`/api/technician/profile-assets/police-record?technicianProfileId=${tech.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-700 underline"
                    >
                      Ver récord policial
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
            <p className="text-sm text-slate-600">No hay técnicos pendientes de verificación.</p>
          </Card>
        )}
      </section>
    </DashboardShell>
  );
}
