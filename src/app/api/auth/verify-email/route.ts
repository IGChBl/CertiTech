import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/services/email-verification";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${appUrl}/verificar-correo?status=missing-token`);
  }

  const result = await verifyEmailToken(token);
  const status = result.ok ? "success" : result.reason;
  return NextResponse.redirect(`${appUrl}/verificar-correo?status=${status}`);
}
