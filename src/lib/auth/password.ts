import { compare, hash } from "bcryptjs";

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function comparePassword(password: string, hashed: string) {
  return compare(password, hashed);
}
