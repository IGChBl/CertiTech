import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { generateSecureToken } from "@/lib/services/token";
import { sendMail } from "@/lib/services/mailer";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const rate = enforceRateLimit(`forgot-password:${ip}`, { limit: 6, windowMs: 60_000 });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos, intenta más tarde." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = generateSecureToken(24);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/recuperar-contrasena?token=${token}`;

    await sendMail({
      to: user.email,
      subject: "Recupera tu contraseña en CertiTech",
      text: `Recupera tu contraseña usando este enlace: ${resetUrl}`,
    });

    return jsonOk({
      message: "Si el correo existe, enviamos instrucciones para recuperar la cuenta.",
      previewToken: process.env.NODE_ENV === "production" ? undefined : token,
    });
  }

  return jsonOk({
    message: "Si el correo existe, enviamos instrucciones para recuperar la cuenta.",
  });
}

