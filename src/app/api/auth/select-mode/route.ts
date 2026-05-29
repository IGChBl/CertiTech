// src/app/api/auth/select-mode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { setSessionCookies, getCurrentHeaderSession } from "@/lib/auth/session"; // 💡 Importación nativa de tu proyecto
import { jsonError, jsonOk } from "@/lib/http";

const ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "un-secreto-por-defecto-súper-seguro-cambiar-en-prod"
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        if (!body) return jsonError("Datos inválidos", 400);

        const { token, activeRole } = body;

        if (!token || !activeRole) {
            return jsonError("Faltan campos obligatorios (token o activeRole)", 400);
        }

        // Validar que el rol solicitado sea uno de los permitidos
        if (activeRole !== "CLIENT" && activeRole !== "TECHNICIAN") {
            return jsonError("Rol seleccionado inválido", 400);
        }

        let payload;

        // ==========================================
        // 🎛️ CASO A: CAMBIO EN CALIENTE (SWITCHER)
        // ==========================================
        if (token === "session_switch") {
            // Usamos tu función para recuperar la cookie de sesión actual
            const currentSession = await getCurrentHeaderSession();

            if (!currentSession) {
                return jsonError("Sesión no válida o expirada para realizar el cambio", 401);
            }

            // Normalizamos el ID del usuario (soportando tanto .id como .userId según tu tipado)
            const sessionUserId = currentSession.userId || currentSession.id;

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
                const result = await jwtVerify(token, ACCESS_SECRET);
                const jwtPayload = result.payload as any;

                if (jwtPayload.type !== "mode_selection") {
                    return jsonError("Tipo de token inválido para selección de modo", 401);
                }

                payload = {
                    userId: jwtPayload.userId,
                    email: jwtPayload.email,
                    role: jwtPayload.role,
                };
            } catch (error) {
                return jsonError("El enlace o token de inicio de sesión expiró.", 401);
            }
        }

        // ==========================================
        // 🍪 EMISIÓN DEL NUEVO JWT CON EL ROL ACTIVO
        // ==========================================
        await setSessionCookies({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,          // Guarda el rol base de la BD (ej. USER o TECHNICIAN)
            activeRole: activeRole,      // Guarda el sombrero actual elegido (CLIENT o TECHNICIAN)
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