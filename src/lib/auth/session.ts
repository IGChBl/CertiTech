import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/constants";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function setSessionCookies(payload: {
  userId: string;
  role: "CLIENT" | "TECHNICIAN" | "ADMIN";
  email: string;
}) {
  const store = await cookies();

  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  store.set(AUTH_COOKIE, accessToken, {
    ...common,
    maxAge: 60 * 30,
  });

  store.set(AUTH_REFRESH_COOKIE, refreshToken, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookies() {
  const store = await cookies();

  store.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  store.set(AUTH_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionFromCookies() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(token);

    return {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function refreshSessionIfNeeded() {
  const store = await cookies();
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return null;
  }

  try {
    const payload = await verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    await setSessionCookies({
      userId: user.id,
      email: user.email,
      role: user.role.code,
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role.code,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = (await getSessionFromCookies()) ?? (await refreshSessionIfNeeded());

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      role: true,
      clientProfile: true,
      technicianProfile: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user;
}
