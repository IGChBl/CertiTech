import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerClientSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookies } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/services/email-verification";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";
import { getPrismaFriendlyErrorMessage } from "@/lib/prisma-errors";

export async function POST(request: NextRequest) {
  try {
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
          error: "Datos inválidos",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, password, phone, fullName, birthDate, city, zone, bio, identityDocumentNumber } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return jsonError("Ya existe una cuenta con ese correo", 409);
    }

    const role = await prisma.role.findUnique({ where: { code: "CLIENT" } });

    if (!role) {
      return jsonError("Configuración de roles incompleta", 500);
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        phone,
        birthDate: new Date(birthDate),
        isEmailVerified: false,
        emailVerifiedAt: null,
        roleId: role.id,
        clientProfile: {
          create: {
            fullName,
            city,
            zone,
            bio,
            identityDocumentNumber: identityDocumentNumber || null,
            verificationStatus: "PENDING",
          },
        },
      },
      include: {
        role: true,
        clientProfile: true,
      },
    });

    const emailResult = await sendVerificationEmail({
      userId: user.id,
      email: user.email,
      context: {
        accountType: "cliente",
        fullName,
      },
    });

    await setSessionCookies({
      userId: user.id,
      email: user.email,
      role: user.role.code,
    });

    return jsonOk(
      {
        message: "Cuenta creada correctamente",
        user: {
          id: user.id,
          email: user.email,
          role: user.role.code,
          fullName: user.clientProfile?.fullName,
          verificationStatus: user.clientProfile?.verificationStatus,
          isEmailVerified: user.isEmailVerified,
        },
        emailVerification: {
          sent: emailResult.ok,
          warning: emailResult.ok
            ? undefined
            : "La cuenta fue creada, pero no se pudo enviar el correo de verificación. Usa 'Reenviar correo'.",
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2024") {
      return jsonError(getPrismaFriendlyErrorMessage(error, "No se pudo completar el registro en este momento."), 503);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return jsonError(
        "La base de datos está desactualizada para este registro. Ejecuta migraciones y vuelve a intentar.",
        500,
      );
    }

    console.error("register-client error", error);
    return jsonError(getPrismaFriendlyErrorMessage(error, "No se pudo completar el registro en este momento."), 500);
  }
}

