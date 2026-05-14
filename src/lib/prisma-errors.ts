import { Prisma } from "@prisma/client";

export const PRISMA_CONNECTION_BUSY_MESSAGE =
  "La base de datos está ocupada temporalmente. Intenta nuevamente en unos segundos.";

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "";
}

export function isPrismaConnectionTimeoutError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2024") {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("timed out fetching a new connection") ||
    message.includes("server has closed the connection") ||
    message.includes("max clients reached") ||
    message.includes("emaxconnsession")
  );
}

export function getPrismaFriendlyErrorMessage(error: unknown, fallbackMessage: string) {
  if (isPrismaConnectionTimeoutError(error)) {
    return PRISMA_CONNECTION_BUSY_MESSAGE;
  }

  return fallbackMessage;
}
