import { randomBytes } from "crypto";

export function generateSecureToken(size = 32) {
  return randomBytes(size).toString("hex");
}
