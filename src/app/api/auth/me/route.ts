import { getCurrentSessionPayload } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function GET() {
  try {
    const session = await getCurrentSessionPayload();

    if (!session) {
      return jsonError("No autenticado", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        status: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        role: {
          select: {
            code: true,
          },
        },
        clientProfile: {
          select: {
            id: true,
            fullName: true,
            city: true,
            zone: true,
            verificationStatus: true,
          },
        },
        technicianProfile: {
          select: {
            id: true,
            displayName: true,
            businessName: true,
            city: true,
            workZone: true,
            verification: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return jsonError("No autenticado", 401);
    }

    return jsonOk({
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
        isEmailVerified: user.isEmailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        profile:
          user.role.code === "CLIENT"
            ? user.clientProfile
            : user.role.code === "TECHNICIAN"
              ? user.technicianProfile
              : null,
      },
    });
  } catch (error) {
    const statusCode = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return jsonError(
      getPrismaFriendlyErrorMessage(error, "No se pudo cargar tu sesión en este momento."),
      statusCode,
    );
  }
}
