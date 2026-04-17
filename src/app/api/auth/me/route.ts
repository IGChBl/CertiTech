import { getCurrentUser } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/http";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("No autenticado", 401);
  }

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      role: user.role.code,
      profile:
        user.role.code === "CLIENT"
          ? user.clientProfile
          : user.role.code === "TECHNICIAN"
            ? user.technicianProfile
            : null,
    },
  });
}
