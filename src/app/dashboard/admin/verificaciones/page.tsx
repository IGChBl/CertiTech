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

function technicianDocumentUrl(kind: string, technicianProfileId: string, index?: number) {
  const params = new URLSearchParams({ kind, technicianProfileId });
  if (index !== undefined) params.set("index", String(index));
  return `/api/technician/profile-assets/document?${params.toString()}`;
}

type DocumentStatus = "uploaded" | "missing" | "unavailable";

function documentStatusForReference(reference: string | null | undefined): DocumentStatus {
  if (reference === null || reference === undefined || reference.length === 0) return "missing";
  if (reference.trim().length === 0) return "unavailable";
  return "uploaded";
}

function DocumentStatusBadge({ status, required }: { status: DocumentStatus; required: boolean }) {
  if (status === "uploaded") {
    return <span className="font-medium text-emerald-700">Cargado</span>;
  }
  if (status === "unavailable") {
    return <span className="font-medium text-slate-600">No disponible</span>;
  }
  return (
    <span className="font-medium text-amber-700">
      {required ? "Pendiente — falta carga" : "No disponible"}
    </span>
  );
}

function DocumentViewLink({ href, label = "Ver documento" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
    >
      {label}
    </a>
  );
}

function DocumentReviewRow({
  label,
  reference,
  href,
  required,
}: {
  label: string;
  reference: string | null;
  href: string;
  required: boolean;
}) {
  const status = documentStatusForReference(reference);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-slate-900">
          {label}
          {required ? (
            <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-500">obligatorio</span>
          ) : null}
        </span>
        <DocumentStatusBadge status={status} required={required} />
      </div>
      {status === "uploaded" ? <DocumentViewLink href={href} /> : null}
    </div>
  );
}

function DocumentReviewListRow({
  label,
  references,
  buildHref,
  required,
}: {
  label: string;
  references: string[];
  buildHref: (index: number) => string;
  required: boolean;
}) {
  const count = references.length;
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-slate-900">
          {label}
          {required ? (
            <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-500">obligatorio</span>
          ) : null}
        </span>
        {count > 0 ? (
          <span className="font-medium text-emerald-700">
            {count} archivo{count === 1 ? "" : "s"} cargado{count === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="font-medium text-amber-700">
            {required ? "Pendiente — falta carga" : "No disponible"}
          </span>
        )}
      </div>
      {count > 0 ? (
        <ul className="space-y-1">
          {references.map((_, index) => (
            <li
              key={`${label}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-1"
            >
              <span className="text-slate-700">{`${label} #${index + 1}`}</span>
              <DocumentViewLink href={buildHref(index)} label="Ver" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatDate(value: Date | null) {
  if (!value) return "No definido";
  return new Date(value).toLocaleDateString("es-NI");
}

export default async function AdminVerificacionesPage() {
  await requirePageRole("ADMIN");

  const clientsResult = await prisma.clientProfile
    .findMany({
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
    })
    .then((data) => ({ clients: data, hasWarning: false }))
    .catch((error) => {
      console.error("[admin][verificaciones] Error cargando clientes", error);
      return { clients: [], hasWarning: true };
    });

  const techniciansResult = await prisma.technicianProfile
    .findMany({
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
          select: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        verificationRequests: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
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
    })
    .then((data) => ({ technicians: data, hasWarning: false }))
    .catch((error) => {
      console.error("[admin][verificaciones] Error cargando técnicos", error);
      return { technicians: [], hasWarning: true };
    });

  const clients = clientsResult.clients;
  const technicians = techniciansResult.technicians;
  const hasWarning = clientsResult.hasWarning || techniciansResult.hasWarning;

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
              const allDocumentsComplete =
                hasIdentityDocument && hasPoliceRecord && hasEvidence && hasCertifications;

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
                    <p>Última revisión: {formatDate(tech.verifiedAt)}</p>
                    <p>Revisado por: {tech.verifiedBy?.email ?? "Sin asignar"}</p>
                    <p>Solicitud verificación: {latestRequest?.status ?? "No existe"}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">Documentos para revisión</p>
                    {!allDocumentsComplete ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Faltan documentos obligatorios. No apruebes a este técnico hasta que se completen los archivos requeridos.
                      </p>
                    ) : null}

                    <DocumentReviewRow
                      label="Documento de identidad"
                      reference={tech.identityDocumentUrl}
                      href={technicianDocumentUrl("identityDocument", tech.id)}
                      required
                    />
                    <DocumentReviewRow
                      label="Récord policial"
                      reference={tech.policeRecordUrl}
                      href={technicianDocumentUrl("policeRecord", tech.id)}
                      required
                    />
                    <DocumentReviewListRow
                      label="Evidencias de trabajo"
                      references={workEvidence}
                      buildHref={(index) => technicianDocumentUrl("workEvidence", tech.id, index)}
                      required
                    />
                    <DocumentReviewListRow
                      label="Certificaciones"
                      references={certifications}
                      buildHref={(index) => technicianDocumentUrl("certification", tech.id, index)}
                      required
                    />
                  </div>

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
