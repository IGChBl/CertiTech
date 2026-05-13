import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { sendVerificationEmail } from "@/lib/services/email-verification";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getIpFromRequest, jsonError, jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const ip = getIpFromRequest(request);
  const rate = enforceRateLimit(`resend-verification:${ip}:${auth.user.id}`, { limit: 4, windowMs: 60_000 });

  if (!rate.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta nuevamente en unos minutos." }, { status: 429 });
  }

  if (auth.user.isEmailVerified) {
    return jsonOk({ message: "Tu correo ya está verificado.", sent: true });
  }

  const context =
    auth.user.role.code === "TECHNICIAN"
      ? { accountType: "tecnico" as const, fullName: auth.user.technicianProfile?.displayName ?? null }
      : { accountType: "cliente" as const, fullName: auth.user.clientProfile?.fullName ?? null };

  const result = await sendVerificationEmail({
    userId: auth.user.id,
    email: auth.user.email,
    context,
  });

  if (!result.ok) {
    return jsonError(
      `No se pudo enviar el correo de verificación (${result.provider}). ${result.error}`,
      502,
    );
  }

  return jsonOk({
    sent: true,
    message: "Te enviamos un nuevo correo de verificación.",
  });
}
