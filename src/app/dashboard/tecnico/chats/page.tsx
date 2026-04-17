import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatPanel } from "@/components/chat/chat-panel";

const technicianLinks = [
  { href: "/dashboard/tecnico", label: "Resumen" },
  { href: "/dashboard/tecnico/solicitudes", label: "Solicitudes" },
  { href: "/dashboard/tecnico/trabajos", label: "Trabajos" },
  { href: "/dashboard/tecnico/chats", label: "Chats" },
  { href: "/dashboard/tecnico/valoraciones", label: "Valoraciones" },
  { href: "/dashboard/tecnico/galeria", label: "Galeria" },
  { href: "/dashboard/tecnico/configuracion", label: "Configuracion" },
];

export default async function TecnicoChatsPage() {
  const user = await requirePageRole("TECHNICIAN");

  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: { userId: user.id },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            include: {
              clientProfile: true,
              technicianProfile: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DashboardShell
      title="Chats con clientes"
      subtitle="Responde en tiempo real y coordina los detalles del servicio."
      links={technicianLinks}
    >
      <ChatPanel
        currentUserId={user.id}
        initialChats={chats.map((chat) => ({
          id: chat.id,
          participants: chat.participants.map((participant) => ({
            userId: participant.user.id,
            name:
              participant.user.clientProfile?.fullName ??
              participant.user.technicianProfile?.displayName ??
              participant.user.email,
          })),
          latestMessage: chat.messages[0] ? { content: chat.messages[0].content } : null,
        }))}
      />
    </DashboardShell>
  );
}
