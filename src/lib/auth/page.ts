import { redirect } from "next/navigation";
import { getCurrentPageUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/constants";

export async function requirePageAuth() {
  const user = await getCurrentPageUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePageRole(role: "CLIENT" | "TECHNICIAN" | "ADMIN") {
  const user = await requirePageAuth();

  if (user.role.code !== role) {
    redirect(ROLE_HOME[user.role.code]);
  }

  return user;
}
