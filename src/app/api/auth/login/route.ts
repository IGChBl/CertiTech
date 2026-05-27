import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { comparePassword } from "@/lib/auth/password";
import { setSessionCookies } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function POST(request: NextRequest) {
  try {
    const ip = getIpFromRequest(request);
    const rate = enforceRateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });

    if (!rate.allowed) {
      return jsonError("Demasiados intentos de inicio de sesión", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Credenciales inválidas", 400);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        status: true,
        passwordHash: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!user) {
      return jsonError("Correo o contraseña incorrectos", 401);
    }

    if (user.status !== "ACTIVE") {
      return jsonError("Tu cuenta está suspendida o inactiva", 403);
    }

    const ok = await comparePassword(password, user.passwordHash);

    if (!ok) {
      return jsonError("Correo o contraseña incorrectos", 401);
    }

    await setSessionCookies({
      userId: user.id,
      email: user.email,
      role: user.role.code,
    });

    void prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch((error) => {
        console.warn("[auth][login] No se pudo actualizar lastLoginAt", error);
      });

    return jsonOk({
      message: "Sesión iniciada",
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
        name: user.email,
      },
    });
  } catch (error) {
    console.error("login error", error);
    const statusCode = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return jsonError(getPrismaFriendlyErrorMessage(error, "No se pudo iniciar sesión en este momento."), statusCode);
  }
}
