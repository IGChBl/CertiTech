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

/**
 * Error tipado que representa una saturación temporal del pool de conexiones
 * (Prisma P2024 / pgbouncer) tras agotar los reintentos. Permite distinguir
 * "base de datos ocupada" de un fallo real para no cerrar la sesión del usuario.
 */
export class DbBusyError extends Error {
  constructor(cause?: unknown) {
    super(PRISMA_CONNECTION_BUSY_MESSAGE);
    this.name = "DbBusyError";
    this.cause = cause;
  }
}

export function isDbBusyError(error: unknown): error is DbBusyError {
  return error instanceof DbBusyError;
}

type WithDbRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
};

/**
 * Ejecuta una operación de Prisma reintentándola con backoff exponencial solo
 * cuando falla por una saturación temporal de conexiones (P2024). Cualquier otro
 * error se propaga de inmediato.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { retries = 2, baseDelayMs = 150 }: WithDbRetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isPrismaConnectionTimeoutError(error)) {
        throw error;
      }

      lastError = error;

      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
