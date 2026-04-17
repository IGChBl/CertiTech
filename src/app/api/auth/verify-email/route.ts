import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  const verification = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token invalido o expirado" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verification.userId },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/login?verified=1`);
}
