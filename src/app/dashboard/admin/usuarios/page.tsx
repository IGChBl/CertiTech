import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const adminLinks = [
  { href: "/dashboard/admin", label: "Resumen" },
  { href: "/dashboard/admin/usuarios", label: "Usuarios" },
  { href: "/dashboard/admin/tecnicos", label: "Tecnicos" },
  { href: "/dashboard/admin/categorias", label: "Categorias" },
  { href: "/dashboard/admin/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/admin/reportes", label: "Reportes" },
  { href: "/dashboard/admin/resenas", label: "Resenas" },
  { href: "/dashboard/admin/moderacion", label: "Moderacion" },
];

export default async function AdminUsuariosPage() {
  await requirePageRole("ADMIN");

  const users = await prisma.user.findMany({
    include: {
      role: true,
      clientProfile: true,
      technicianProfile: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <DashboardShell title="Gestion de usuarios" subtitle="Busqueda y monitoreo de cuentas registradas." links={adminLinks}>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2">Correo</th>
              <th className="px-2 py-2">Rol</th>
              <th className="px-2 py-2">Nombre</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="px-2 py-2 text-slate-700">{user.email}</td>
                <td className="px-2 py-2 text-slate-700">{user.role.code}</td>
                <td className="px-2 py-2 text-slate-700">
                  {user.clientProfile?.fullName ?? user.technicianProfile?.displayName ?? "-"}
                </td>
                <td className="px-2 py-2">
                  <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>{user.status}</Badge>
                </td>
                <td className="px-2 py-2 text-slate-500">{new Date(user.createdAt).toLocaleDateString("es-NI")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  );
}
