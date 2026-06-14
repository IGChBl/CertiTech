// src/app/api/auth/select-mode/route.ts
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { setSessionCookies, getCurrentHeaderSession } from "@/lib/auth/session"; // 💡 Importación nativa de tu proyecto
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

type SessionRole = "CLIENT" | "TECHNICIAN" | "ADMIN";
type ActiveRole = "CLIENT" | "TECHNICIAN";

type ModeSelectionPayload = JWTPayload & {
    type?: string;
    userId?: string;
    email?: string;
    role?: SessionRole;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isActiveRole(value: unknown): value is ActiveRole {
    return value === "CLIENT" || value === "TECHNICIAN";
}

function isSessionRole(value: unknown): value is SessionRole {
    return value === "CLIENT" || value === "TECHNICIAN" || value === "ADMIN";
}

const ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-cambiar-en-produccion",
);

export async function POST(request: NextRequest) {
    try {
        const body: unknown = await request.json().catch(() => null);
        if (!isRecord(body)) return jsonError("Datos inválidos", 400);

        const { token, activeRole } = body;

        if (typeof token !== "string" || !isActiveRole(activeRole)) {
            return jsonError("Faltan campos obligatorios (token o activeRole)", 400);
        }

        // Validar que el rol solicitado sea uno de los permitidos
        let payload: {
            userId: string;
            email: string;
            role: SessionRole;
        };

        // ==========================================
        // 🎛️ CASO A: CAMBIO EN CALIENTE (SWITCHER)
        // ==========================================
        if (token === "session_switch") {
            // Usamos tu función para recuperar la cookie de sesión actual
            const currentSession = await getCurrentHeaderSession();

            if (!currentSession) {
                return jsonError("Sesión no válida o expirada para realizar el cambio", 401);
            }

            const sessionUserId = currentSession.userId;

            if (!sessionUserId) {
                return jsonError("No se pudo determinar el ID de usuario desde la sesión", 401);
            }

            payload = {
                userId: sessionUserId,
                email: currentSession.email,
                role: currentSession.role,
            };

        } else {
            // ==========================================
            // 🔐 CASO B: FLUJO DESDE EL LOGIN TRADICIONAL
            // ==========================================
            try {
                const result = await jwtVerify<ModeSelectionPayload>(token, ACCESS_SECRET);
                const jwtPayload = result.payload;

                if (jwtPayload.type !== "mode_selection") {
                    return jsonError("Tipo de token inválido para selección de modo", 401);
                }

                if (
                    typeof jwtPayload.userId !== "string" ||
                    typeof jwtPayload.email !== "string" ||
                    !isSessionRole(jwtPayload.role)
                ) {
                    return jsonError("Token de selección de modo incompleto", 401);
                }

                payload = {
                    userId: jwtPayload.userId,
                    email: jwtPayload.email,
                    role: jwtPayload.role,
                };
            } catch {
                return jsonError("El enlace o token de inicio de sesión expiró.", 401);
            }
        }

        const userProfiles = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                clientProfile: { select: { id: true } },
                technicianProfile: { select: { id: true } },
            },
        });

        const hasRequestedProfile =
            activeRole === "CLIENT" ? !!userProfiles?.clientProfile : !!userProfiles?.technicianProfile;

        if (!hasRequestedProfile) {
            return jsonError("No tienes el perfil requerido para seleccionar este modo", 403);
        }

        // ==========================================
        // 🍪 EMISIÓN DEL NUEVO JWT CON EL ROL ACTIVO
        // ==========================================
        await setSessionCookies({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,          // Guarda el rol base de la BD (ej. USER o TECHNICIAN)
            activeRole,                 // Guarda el sombrero actual elegido (CLIENT o TECHNICIAN)
        });

        return jsonOk({
            message: `Modo cambiado con éxito a ${activeRole === "CLIENT" ? "Cliente" : "Técnico"}`,
            targetUrl: activeRole === "CLIENT" ? "/dashboard/cliente" : "/dashboard/tecnico"
        });

    } catch (error) {
        console.error("[select-mode] Error crítico en el endpoint:", error);
        return jsonError("Ocurrió un error inesperado al procesar tu solicitud", 500);
    }
}