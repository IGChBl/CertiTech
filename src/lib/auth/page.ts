import { redirect } from "next/navigation";
import { getCurrentPageUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/constants";

export async function requirePageAuth() {
  // getCurrentPageUser devuelve null solo cuando NO hay sesión válida (token
  // ausente/expirado o usuario inactivo) → redirigimos a /login. Si la base de
  // datos está ocupada lanza DbBusyError, que dejamos propagar al error boundary
  // para mostrar un reintento sin cerrar la sesión del usuario.
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
