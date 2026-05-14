import { cookies } from "next/headers";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { AUTH_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/constants";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

const currentUserSelect = {
  id: true,
  email: true,
  phone: true,
  birthDate: true,
  status: true,
  isEmailVerified: true,
  emailVerifiedAt: true,
  role: {
    select: {
      code: true,
    },
  },
  clientProfile: {
    select: {
      id: true,
      fullName: true,
      city: true,
      zone: true,
      avatarUrl: true,
      verificationStatus: true,
      rejectionReason: true,
    },
  },
  technicianProfile: {
    select: {
      id: true,
      displayName: true,
      businessName: true,
      city: true,
      workZone: true,
      avatarUrl: true,
      identityDocumentUrl: true,
      workEvidenceJson: true,
      certificationsJson: true,
      policeRecordUrl: true,
      galleryJson: true,
      referencePriceMin: true,
      referencePriceMax: true,
      verification: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      autoRenew: true,
      featuredUntil: true,
      lastPaymentDate: true,
      rejectionReason: true,
    },
  },
} satisfies Prisma.UserSelect;

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

export type SessionPayload = Awaited<ReturnType<typeof getSessionFromCookies>>;

export async function getCurrentHeaderSession() {
  return getSessionFromCookies();
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
      select: {
        id: true,
        email: true,
        status: true,
        role: {
          select: {
            code: true,
          },
        },
      },
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
  } catch (error) {
    if (isPrismaConnectionTimeoutError(error)) {
      console.warn("[auth][session] Timeout temporal al refrescar sesión");
    }

    return null;
  }
}

async function resolveCurrentUser() {
  const session = (await getSessionFromCookies()) ?? (await refreshSessionIfNeeded());

  if (!session) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: currentUserSelect,
    });

    if (!user || user.status !== "ACTIVE") {
      return null;
    }

    return user;
  } catch (error) {
    if (isPrismaConnectionTimeoutError(error)) {
      console.warn("[auth][session] Timeout temporal cargando usuario actual");
      return null;
    }

    console.error("[auth][session] No se pudo cargar el usuario actual", error);
    return null;
  }
}

export async function getCurrentUser() {
  return resolveCurrentUser();
}

export const getCurrentPageUser = cache(async () => resolveCurrentUser());
