import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http";

export async function POST(request: NextRequest) {
  await clearSessionCookies();

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return jsonOk({ message: "Sesion cerrada" });
}
