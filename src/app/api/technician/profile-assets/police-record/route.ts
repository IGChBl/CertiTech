import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  if (auth.user.role.code !== "TECHNICIAN" && auth.user.role.code !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/api/technician/profile-assets/document";
  url.searchParams.set("kind", "policeRecord");

  return NextResponse.redirect(url);
}
