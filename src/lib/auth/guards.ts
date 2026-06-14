import { NextResponse } from "next/server";
import { getSessionFromCookies, getCurrentUser } from "@/lib/auth/session"; // 💡 Importamos getSessionFromCookies

export async function requireAuth() {
    // 💡 Primero obtenemos la sesión del JWT para validar que exista un token válido
    const session = await getSessionFromCookies();

    if (!session) {
        return {
            error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
            user: null,
            session: null,
        };
    }

    // Obtenemos los datos completos del usuario desde la BD por si la API los necesita
    const user = await getCurrentUser();

    if (!user) {
        return {
            error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
            user: null,
            session: null,
        };
    }

    return { error: null, user, session };
}

export async function requireRole(role: "CLIENT" | "TECHNICIAN" | "ADMIN") {
    const auth = await requireAuth();

    if (auth.error || !auth.user || !auth.session) {
        return auth;
    }

    // 💡 LÓGICA CLAVE: Si el usuario es ADMIN, pasa directo.
    // Si no, validamos contra su 'activeRole' (modo actual) en lugar de su rol base de la BD.
    const currentActiveRole = auth.session.activeRole;

    if (auth.session.role !== "ADMIN" && currentActiveRole !== role) {
        return {
            error: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
            user: null,
            session: null,
        };
    }

    return auth;
}