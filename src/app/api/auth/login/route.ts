import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { comparePassword } from "@/lib/auth/password";
import { setSessionCookies } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const rate = enforceRateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });

  if (!rate.allowed) {
    return jsonError("Demasiados intentos de inicio de sesion", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Credenciales invalidas", 400);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: true,
      clientProfile: true,
      technicianProfile: true,
    },
  });

  if (!user) {
    return jsonError("Correo o contrasena incorrectos", 401);
  }

  if (user.status !== "ACTIVE") {
    return jsonError("Tu cuenta esta suspendida o inactiva", 403);
  }

  const ok = await comparePassword(password, user.passwordHash);

  if (!ok) {
    return jsonError("Correo o contrasena incorrectos", 401);
  }

  await setSessionCookies({
    userId: user.id,
    email: user.email,
    role: user.role.code,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return jsonOk({
    message: "Sesion iniciada",
    user: {
      id: user.id,
      email: user.email,
      role: user.role.code,
      name: user.clientProfile?.fullName ?? user.technicianProfile?.displayName ?? user.email,
    },
  });
}
