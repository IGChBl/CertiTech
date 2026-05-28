"use client";

import { FormEvent, type ReactNode, useRef, useState } from "react";
import { ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type AssetKind = "identityDocument" | "workEvidence" | "certification" | "policeRecord";

type FieldErrors = Record<string, string[]>;

function technicianDocumentUrl(kind: AssetKind, index?: number) {
  const params = new URLSearchParams({ kind });
  if (index !== undefined) params.set("index", String(index));
  return `/api/technician/profile-assets/document?${params.toString()}`;
}

type ProfessionalProfileFormProps = {
  initialIdentityDocumentUrl?: string | null;
  initialPoliceRecordUrl?: string | null;
  initialWorkEvidences?: string[];
  initialCertifications?: string[];
  initialReferencePriceMin?: number | null;
  initialReferencePriceMax?: number | null;
  hasActiveSubscription: boolean;
  verificationStatus: "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
};

function getFirstFieldError(fieldErrors: FieldErrors, field: string) {
  return fieldErrors[field]?.[0] ?? null;
}

function UploadSection({
  title,
  description,
  accept,
  inputId,
  onPick,
  loading,
  children,
}: {
  title: string;
  description: string;
  accept: string;
  inputId: string;
  onPick: (file: File | null) => void;
  loading: boolean;
  children?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {title}
      </label>
      <p className="text-xs text-slate-500">{description}</p>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
        {loading ? "Subiendo..." : "Subir archivo"}
      </Button>
      {children}
    </div>
  );
}

function DocumentRow({
  label = "Documento cargado",
  href,
  onRemove,
  removeLabel = "Eliminar",
}: {
  label?: string;
  href: string;
  onRemove: () => void;
  removeLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver documento
        </a>
        <button type="button" className="inline-flex items-center gap-1 text-rose-700" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
          {removeLabel}
        </button>
      </div>
    </div>
  );
}

export function TechnicianProfessionalProfileForm({
  initialIdentityDocumentUrl,
  initialPoliceRecordUrl,
  initialWorkEvidences = [],
  initialCertifications = [],
  initialReferencePriceMin,
  initialReferencePriceMax,
  hasActiveSubscription,
  verificationStatus,
}: ProfessionalProfileFormProps) {
  const router = useRouter();
  const [identityDocumentUrl, setIdentityDocumentUrl] = useState<string | null>(initialIdentityDocumentUrl ?? null);
  const [policeRecordUrl, setPoliceRecordUrl] = useState<string | null>(initialPoliceRecordUrl ?? null);
  const [workEvidences, setWorkEvidences] = useState<string[]>(initialWorkEvidences);
  const [certifications, setCertifications] = useState<string[]>(initialCertifications);
  const [referencePriceMin, setReferencePriceMin] = useState(
    initialReferencePriceMin !== null && initialReferencePriceMin !== undefined ? String(initialReferencePriceMin) : "",
  );
  const [referencePriceMax, setReferencePriceMax] = useState(
    initialReferencePriceMax !== null && initialReferencePriceMax !== undefined ? String(initialReferencePriceMax) : "",
  );
  const [loadingKind, setLoadingKind] = useState<AssetKind | null>(null);
  const [savingPrices, setSavingPrices] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadAsset(kind: AssetKind, file: File | null) {
    if (!file) return;

    setLoadingKind(kind);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const response = await fetch("/api/technician/profile-assets", {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "No se pudo cargar el archivo.");
      setLoadingKind(null);
      return;
    }

    if (kind === "identityDocument") {
      setIdentityDocumentUrl(Array.isArray(data.values) ? (data.values[0] ?? null) : null);
    } else if (kind === "policeRecord") {
      setPoliceRecordUrl(Array.isArray(data.values) ? (data.values[0] ?? null) : null);
    } else if (kind === "workEvidence") {
      setWorkEvidences(Array.isArray(data.values) ? data.values : []);
    } else if (kind === "certification") {
      setCertifications(Array.isArray(data.values) ? data.values : []);
    }

    setMessage(data.message ?? "Archivo cargado correctamente.");
    setLoadingKind(null);
    router.refresh();
  }

  async function removeAsset(kind: AssetKind, fileUrl?: string) {
    setLoadingKind(kind);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/technician/profile-assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        fileUrl,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "No se pudo eliminar el archivo.");
      setLoadingKind(null);
      return;
    }

    if (kind === "identityDocument") {
      setIdentityDocumentUrl(null);
    } else if (kind === "policeRecord") {
      setPoliceRecordUrl(null);
    } else if (kind === "workEvidence") {
      setWorkEvidences(Array.isArray(data.values) ? data.values : []);
    } else if (kind === "certification") {
      setCertifications(Array.isArray(data.values) ? data.values : []);
    }

    setMessage(data.message ?? "Archivo eliminado correctamente.");
    setLoadingKind(null);
    router.refresh();
  }

  async function savePrices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPrices(true);
    setFieldErrors({});
    setError(null);
    setMessage(null);

    const response = await fetch("/api/technician/profile-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referencePriceMin: referencePriceMin || null,
        referencePriceMax: referencePriceMax || null,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (data.issues?.fieldErrors) {
        setFieldErrors(data.issues.fieldErrors);
      }
      setError(data.error ?? "No se pudieron actualizar los precios.");
      setSavingPrices(false);
      return;
    }

    setMessage(data.message ?? "Precios referenciales actualizados.");
    setSavingPrices(false);
    router.refresh();
  }

  async function requestVerification() {
    if (!policeRecordUrl) {
      setError("Debes subir tu récord policial para continuar con el proceso de verificación.");
      setMessage(null);
      return;
    }

    setRequestingVerification(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/technician/verification/request", {
      method: "POST",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "No se pudo enviar la solicitud de verificación.");
      setRequestingVerification(false);
      return;
    }

    setMessage(data.message ?? "Solicitud de verificación enviada correctamente.");
    setRequestingVerification(false);
    router.refresh();
  }

  return (
    <Card className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Completa tu perfil profesional para aumentar tus oportunidades de ser aprobado y recibir clientes.
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        El récord policial es obligatorio para verificación, visibilidad pública, suscripciones activas y recepción de
        clientes.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <UploadSection
          inputId="technician-identity-document-file"
          title="Documento de identidad"
          description="Sube JPG, PNG, WEBP o PDF."
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onPick={(file) => uploadAsset("identityDocument", file)}
          loading={loadingKind === "identityDocument"}
        >
          {identityDocumentUrl ? (
            <DocumentRow href={technicianDocumentUrl("identityDocument")} onRemove={() => removeAsset("identityDocument")} />
          ) : null}
        </UploadSection>

        <UploadSection
          inputId="technician-police-record-file"
          title="Récord policial (obligatorio)"
          description="Sube JPG, PNG, WEBP o PDF. Este documento es obligatorio para continuar."
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onPick={(file) => uploadAsset("policeRecord", file)}
          loading={loadingKind === "policeRecord"}
        >
          {policeRecordUrl ? (
            <DocumentRow href={technicianDocumentUrl("policeRecord")} onRemove={() => removeAsset("policeRecord")} />
          ) : null}
        </UploadSection>

        <UploadSection
          inputId="technician-work-evidence-file"
          title="Evidencias de trabajos"
          description="Sube imágenes de trabajos realizados (antes/después)."
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onPick={(file) => uploadAsset("workEvidence", file)}
          loading={loadingKind === "workEvidence"}
        >
          {workEvidences.length ? (
            <div className="space-y-1">
              {workEvidences.map((url, index) => (
                <DocumentRow
                  key={url}
                  label={`Evidencia ${index + 1} cargada`}
                  href={technicianDocumentUrl("workEvidence", index)}
                  onRemove={() => removeAsset("workEvidence", url)}
                />
              ))}
            </div>
          ) : null}
        </UploadSection>

        <UploadSection
          inputId="technician-certification-file"
          title="Certificaciones"
          description="Sube certificados en PDF o imagen."
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onPick={(file) => uploadAsset("certification", file)}
          loading={loadingKind === "certification"}
        >
          {certifications.length ? (
            <div className="space-y-1">
              {certifications.map((url, index) => (
                <DocumentRow
                  key={url}
                  label={`Certificación ${index + 1} cargada`}
                  href={technicianDocumentUrl("certification", index)}
                  onRemove={() => removeAsset("certification", url)}
                />
              ))}
            </div>
          ) : null}
        </UploadSection>
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-900">Solicitud de verificación</p>
        <p className="text-xs text-slate-600">
          Envía tu perfil a revisión cuando tengas tus documentos al día. El récord policial es obligatorio.
        </p>
        <Button
          type="button"
          onClick={requestVerification}
          disabled={
            requestingVerification ||
            !policeRecordUrl ||
            verificationStatus === "IN_REVIEW" ||
            verificationStatus === "VERIFIED"
          }
        >
          {verificationStatus === "VERIFIED"
            ? "Perfil ya verificado"
            : verificationStatus === "IN_REVIEW"
              ? "Solicitud en revisión"
              : requestingVerification
                ? "Enviando solicitud..."
                : "Solicitar verificación"}
        </Button>
      </div>

      <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={savePrices}>
        <p className="text-sm font-semibold text-slate-900">Precios referenciales</p>
        <p className="text-xs text-slate-500">
          {hasActiveSubscription
            ? "Tu suscripción está activa. Mantén precios claros para mejorar conversiones."
            : "Puedes configurar tus precios ahora y ajustarlos cuando actives tu suscripción."}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="technician-reference-price-min" className="block text-sm font-medium text-slate-700">
              Precio mínimo
            </label>
            <Input
              id="technician-reference-price-min"
              type="number"
              min={1}
              value={referencePriceMin}
              onChange={(event) => setReferencePriceMin(event.target.value)}
              placeholder="Ej. C$500"
            />
            {getFirstFieldError(fieldErrors, "referencePriceMin") ? (
              <p className="mt-1 text-xs text-rose-700">{getFirstFieldError(fieldErrors, "referencePriceMin")}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="technician-reference-price-max" className="block text-sm font-medium text-slate-700">
              Precio máximo
            </label>
            <Input
              id="technician-reference-price-max"
              type="number"
              min={1}
              value={referencePriceMax}
              onChange={(event) => setReferencePriceMax(event.target.value)}
              placeholder="Ej. C$2,500"
            />
            {getFirstFieldError(fieldErrors, "referencePriceMax") ? (
              <p className="mt-1 text-xs text-rose-700">{getFirstFieldError(fieldErrors, "referencePriceMax")}</p>
            ) : null}
          </div>
        </div>
        <Button type="submit" disabled={savingPrices}>
          {savingPrices ? "Guardando..." : "Guardar precios"}
        </Button>
      </form>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
    </Card>
  );
}
