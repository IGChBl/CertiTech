import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerClientSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookies } from "@/lib/auth/session";
import { generateSecureToken } from "@/lib/services/token";
import { sendMail } from "@/lib/services/mailer";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const rate = enforceRateLimit(`register-client:${ip}`, { limit: 8, windowMs: 60_000 });

  if (!rate.allowed) {
    return jsonError("Demasiados intentos, intenta nuevamente en unos minutos.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = registerClientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos invalidos",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { email, password, phone, fullName, city, zone, bio } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return jsonError("Ya existe una cuenta con ese correo", 409);
  }

  const role = await prisma.role.findUnique({ where: { code: "CLIENT" } });

  if (!role) {
    return jsonError("Configuracion de roles incompleta", 500);
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      phone,
      roleId: role.id,
      clientProfile: {
        create: {
          fullName,
          city,
          zone,
          bio,
        },
      },
    },
    include: {
      role: true,
      clientProfile: true,
    },
  });

  const verifyToken = generateSecureToken(24);
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: verifyToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verifyToken}`;

  await sendMail({
    to: user.email,
    subject: "Verifica tu correo en CertiTech",
    text: `Bienvenido a CertiTech. Verifica tu cuenta aqui: ${verifyUrl}`,
  });

  await setSessionCookies({
    userId: user.id,
    email: user.email,
    role: user.role.code,
  });

  return jsonOk({
    message: "Cuenta creada correctamente",
    user: {
      id: user.id,
      email: user.email,
      role: user.role.code,
      fullName: user.clientProfile?.fullName,
    },
  }, 201);
}

