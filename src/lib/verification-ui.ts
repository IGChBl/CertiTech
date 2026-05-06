import type { BadgeVariant } from "@/components/ui/badge";

type VerificationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "IN_REVIEW"
  | "BASIC_VERIFIED"
  | "FULLY_VERIFIED"
  | "VERIFIED"
  | "REJECTED";

function normalizeStatus(status?: string | null): VerificationStatus | null {
  if (!status) return null;

  if (status === "IN_REVIEW") return "UNDER_REVIEW";
  if (status === "VERIFIED") return "FULLY_VERIFIED";

  if (
    status === "PENDING" ||
    status === "UNDER_REVIEW" ||
    status === "BASIC_VERIFIED" ||
    status === "FULLY_VERIFIED" ||
    status === "REJECTED"
  ) {
    return status;
  }

  return null;
}

export function getVerificationLabel(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (!normalized) {
    return status ?? "Sin estado";
  }

  const labels: Record<VerificationStatus, string> = {
    PENDING: "Pendiente",
    UNDER_REVIEW: "En revisión",
    IN_REVIEW: "En revisión",
    BASIC_VERIFIED: "Verificada",
    FULLY_VERIFIED: "Verificación completa",
    VERIFIED: "Verificación completa",
    REJECTED: "Rechazada",
  };

  return labels[normalized];
}

export function getVerificationColor(status?: string | null): BadgeVariant {
  const normalized = normalizeStatus(status);

  if (!normalized) return "neutral";

  const colors: Record<VerificationStatus, BadgeVariant> = {
    PENDING: "warning",
    UNDER_REVIEW: "info",
    IN_REVIEW: "info",
    BASIC_VERIFIED: "success",
    FULLY_VERIFIED: "premium",
    VERIFIED: "premium",
    REJECTED: "danger",
  };

  return colors[normalized];
}
