import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "tm_access_token";

function parseRoleFromToken(token: string | undefined) {
  if (!token) return null;

  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { role?: "CLIENT" | "TECHNICIAN" | "ADMIN" };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function roleHome(role: "CLIENT" | "TECHNICIAN" | "ADMIN") {
  if (role === "CLIENT") return "/dashboard/cliente";
  if (role === "TECHNICIAN") return "/dashboard/tecnico";
  return "/dashboard/admin";
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const role = parseRoleFromToken(token);

  if (!token || !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard/cliente") && role !== "CLIENT") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  if (pathname.startsWith("/dashboard/tecnico") && role !== "TECHNICIAN") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
