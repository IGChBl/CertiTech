import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
      user: null,
    };
  }

  return { error: null, user };
}

export async function requireRole(role: "CLIENT" | "TECHNICIAN" | "ADMIN") {
  const auth = await requireAuth();

  if (auth.error || !auth.user) {
    return auth;
  }

  if (auth.user.role.code !== role) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 403 }),
      user: null,
    };
  }

  return auth;
}
