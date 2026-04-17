import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerTechnicianSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookies } from "@/lib/auth/session";
import { generateSecureToken } from "@/lib/services/token";
import { sendMail } from "@/lib/services/mailer";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const rate = enforceRateLimit(`register-tech:${ip}`, { limit: 8, windowMs: 60_000 });

  if (!rate.allowed) {
    return jsonError("Demasiados intentos, intenta nuevamente en unos minutos.", 429);
  }

  const body = await request.json().catch(() => null);

  if (body?.yearsExperience !== undefined) {
    body.yearsExperience = Number(body.yearsExperience);
  }

  if (body?.referencePriceMin !== undefined && body.referencePriceMin !== "") {
    body.referencePriceMin = Number(body.referencePriceMin);
  }

  if (body?.referencePriceMax !== undefined && body.referencePriceMax !== "") {
    body.referencePriceMax = Number(body.referencePriceMax);
  }

  const parsed = registerTechnicianSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos invalidos",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    email,
    password,
    phone,
    displayName,
    businessName,
    city,
    workZone,
    description,
    yearsExperience,
    availabilityText,
    scheduleText,
    categoryIds,
    referencePriceMin,
    referencePriceMax,
    documentUrl,
  } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return jsonError("Ya existe una cuenta con ese correo", 409);
  }

  const role = await prisma.role.findUnique({ where: { code: "TECHNICIAN" } });

  if (!role) {
    return jsonError("Configuracion de roles incompleta", 500);
  }

  const categories = await prisma.serviceCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });

  if (categories.length === 0) {
    return jsonError("Selecciona al menos una categoria valida", 400);
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      phone,
      roleId: role.id,
      technicianProfile: {
        create: {
          displayName,
          businessName,
          city,
          workZone,
          description,
          yearsExperience,
          availabilityText,
          scheduleText,
          referencePriceMin,
          referencePriceMax,
          verification: documentUrl ? "IN_REVIEW" : "UNVERIFIED",
        },
      },
    },
    include: {
      role: true,
      technicianProfile: true,
    },
  });

  if (!user.technicianProfile) {
    return jsonError("No se pudo crear el perfil tecnico", 500);
  }

  await prisma.technicianService.createMany({
    data: categories.map((category) => ({
      technicianId: user.technicianProfile!.id,
      categoryId: category.id,
      title: "Servicio principal",
    })),
    skipDuplicates: true,
  });

  if (documentUrl) {
    await prisma.verificationRequest.create({
      data: {
        technicianProfileId: user.technicianProfile.id,
        requestedById: user.id,
        documentUrl,
        status: "PENDING",
      },
    });
  }

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
    text: `Tu cuenta tecnica fue creada. Verifica tu correo aqui: ${verifyUrl}`,
  });

  await setSessionCookies({
    userId: user.id,
    email: user.email,
    role: user.role.code,
  });

  return jsonOk(
    {
      message: "Cuenta tecnica creada correctamente",
      user: {
        id: user.id,
        email: user.email,
        role: user.role.code,
        displayName: user.technicianProfile.displayName,
        verification: user.technicianProfile.verification,
      },
    },
    201,
  );
}

