import { SignJWT, jwtVerify } from "jose";

type TokenPayload = {
  userId: string;
  role: "CLIENT" | "TECHNICIAN" | "ADMIN";
  email: string;
  type: "access" | "refresh";
};

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-cambiar-en-produccion",
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-cambiar-en-produccion",
);

export async function signAccessToken(payload: Omit<TokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(payload: Omit<TokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify<TokenPayload>(token, ACCESS_SECRET);
  if (result.payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return result.payload;
}

export async function verifyRefreshToken(token: string) {
  const result = await jwtVerify<TokenPayload>(token, REFRESH_SECRET);
  if (result.payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return result.payload;
}
