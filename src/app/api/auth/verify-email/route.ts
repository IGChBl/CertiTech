import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/services/email-verification";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(`${appUrl}/verificar-correo?status=missing-token`);
    }

    const result = await verifyEmailToken(token);
    const status = result.ok ? "success" : result.reason;
    return NextResponse.redirect(`${appUrl}/verificar-correo?status=${status}`);
  } catch (error) {
    console.error("verify-email error", error);
    return NextResponse.redirect(`${appUrl}/verificar-correo?status=temporary-error`);
  }
}
