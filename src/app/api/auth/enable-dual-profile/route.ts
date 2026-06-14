// src/app/api/auth/enable-dual-profile/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/guards"; // Tus guards optimizados
import { setSessionCookies } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";

type EnableDualProfileRequest = {
    actionType?: "CREATE_TECHNICIAN" | "CREATE_CLIENT";
    displayName?: string;
    description?: string;
    yearsExperience?: string | number;
    availabilityText?: string;
    scheduleText?: string;
    categoryIds?: string[];
    city?: string;
    zone?: string;
    bio?: string;
};

function isEnableDualProfileRequest(value: unknown): value is EnableDualProfileRequest {
    return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Validar que el usuario esté logueado
        const auth = await requireAuth();
        if (auth.error || !auth.user || !auth.session) {
            return auth.error ?? jsonError("No autorizado", 401);
        }

        const userId = auth.user.id;
        const body = await request.json().catch(() => null);

        if (!isEnableDualProfileRequest(body)) return jsonError("Datos inválidos", 400);

        // 2. Detectar qué perfil le falta y crearlo
        if (body.actionType === "CREATE_TECHNICIAN") {
            // Validar campos mínimos del técnico
            const { displayName, description, yearsExperience, availabilityText, scheduleText, categoryIds } = body;

            if (!displayName || !description || !categoryIds?.length) {
                return jsonError("Faltan campos obligatorios para el perfil técnico", 400);
            }

            const fullUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { clientProfile: true },
            });

            if (!fullUser) {
                return jsonError("Usuario no encontrado en el sistema", 404);
            }

            const uniqueCategoryIds = Array.from(new Set(categoryIds as string[]));
            const categories = await prisma.serviceCategory.findMany({
                where: { id: { in: uniqueCategoryIds } },
                select: { id: true },
            });

            if (categories.length !== uniqueCategoryIds.length) {
                return jsonError("Selecciona categorías válidas", 400);
            }

            // Creamos el perfil técnico enlazado al mismo usuario
            const technicianProfile = await prisma.technicianProfile.create({
                data: {
                    userId,
                    displayName,
                    city: fullUser.clientProfile?.city ?? "Managua",
                    workZone: fullUser.clientProfile?.zone ?? null,
                    description,
                    yearsExperience: Number(yearsExperience),
                    availabilityText,
                    scheduleText,
                    subscriptionPlan: "FREE",
                    subscriptionStatus: "ACTIVE",
                    subscriptionStartDate: new Date(),
                    autoRenew: false,
                    verification: "PENDING",
                },
            });

            await prisma.technicianService.createMany({
                data: categories.map((category) => ({
                    technicianId: technicianProfile.id,
                    categoryId: category.id,
                    title: "Servicio principal",
                })),
                skipDuplicates: true,
            });

        } else if (body.actionType === "CREATE_CLIENT") {
            const { city, zone, bio } = body;

            if (!city || !zone) {
                return jsonError("Faltan campos obligatorios para el perfil de cliente", 400);
            }

            // Buscamos al usuario base e incluimos su perfil técnico para heredar los campos obligatorios
            const fullUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { technicianProfile: true }
            });

            if (!fullUser) {
                return jsonError("Usuario no encontrado en el sistema", 404);
            }

            // Mapeamos de forma segura los valores requeridos por el registro de cliente
            const derivedFullName = fullUser.email || fullUser.technicianProfile?.displayName || "Usuario CertiTech";
            const derivedIdentityDocument = fullUser.technicianProfile?.identityDocumentUrl || "";

            // Creamos el perfil cliente acoplando los campos EXACTOS que pide tu esquema de Prisma
            await prisma.clientProfile.create({
                data: {
                    userId,
                    city,
                    zone,
                    bio,
                    fullName: derivedFullName,
                    identityDocumentUrl: derivedIdentityDocument, // 💥 Corregido según tu consola
                },
            });
        } else {
            return jsonError("Acción no soportada", 400);
        }

        // 3. Forzar la actualización de cookies para que el sistema reconozca el perfil dual de inmediato
        await setSessionCookies({
            userId: auth.session.userId,
            email: auth.session.email,
            role: auth.session.role,
            activeRole: auth.session.activeRole ?? undefined, // Mantiene el modo actual en el que estaba
        });

        return jsonOk({ message: "Perfil opuesto activado con éxito. ¡Ahora eres un usuario dual!" });
    } catch (error) {
        console.error("[enable-dual-profile] Error catastrófico", error);
        return jsonError("No se pudo activar el perfil en este momento", 500);
    }
}