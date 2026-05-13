import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerTechnicianSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookies } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/services/email-verification";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
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
      birthDate,
      city,
      workZone,
      description,
      yearsExperience,
      availabilityText,
      scheduleText,
      categoryIds,
      referencePriceMin,
      referencePriceMax,
      identityDocumentUrl,
      avatarUrl,
      workEvidenceUrls,
      certificationUrls,
      policeRecordUrl,
    } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return jsonError("Ya existe una cuenta con ese correo", 409);
    }

    const role = await prisma.role.findUnique({ where: { code: "TECHNICIAN" } });

    if (!role) {
      return jsonError("Configuracion de roles incompleta", 500);
    }

    const uniqueCategoryIds = Array.from(new Set(categoryIds));
    const categories = await prisma.serviceCategory.findMany({
      where: { id: { in: uniqueCategoryIds } },
      select: { id: true },
    });

    if (categories.length !== uniqueCategoryIds.length) {
      return jsonError("Selecciona categorias validas", 400);
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
            avatarUrl: avatarUrl || null,
            identityDocumentUrl,
            workEvidenceJson: workEvidenceUrls,
            certificationsJson: certificationUrls ?? [],
            policeRecordUrl,
            referencePriceMin,
            referencePriceMax,
            verification: "IN_REVIEW",
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

    await prisma.verificationRequest.create({
      data: {
        technicianProfileId: user.technicianProfile.id,
        requestedById: user.id,
        documentUrl: identityDocumentUrl,
        status: "PENDING",
        notes: "Registro inicial, pendiente de revision administrativa.",
      },
    });

    const emailResult = await sendVerificationEmail({
      userId: user.id,
      email: user.email,
      context: {
        accountType: "tecnico",
        fullName: displayName,
      },
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
          isEmailVerified: user.isEmailVerified,
        },
        emailVerification: {
          sent: emailResult.ok,
          warning: emailResult.ok
            ? undefined
            : "La cuenta fue creada, pero no se pudo enviar el correo de verificacion. Usa 'Reenviar correo'.",
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return jsonError(
        "La base de datos esta desactualizada para este registro. Ejecuta migraciones y vuelve a intentar.",
        500,
      );
    }

    console.error("register-technician error", error);
    return jsonError("No se pudo completar el registro tecnico en este momento.", 500);
  }
}

