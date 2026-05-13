import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatPanel } from "@/components/chat/chat-panel";

const clientLinks = [
  { href: "/dashboard/cliente", label: "Resumen" },
  { href: "/dashboard/cliente/solicitudes", label: "Mis solicitudes" },
  { href: "/dashboard/cliente/chats", label: "Mis chats" },
  { href: "/dashboard/cliente/favoritos", label: "Favoritos" },
  { href: "/dashboard/cliente/resenas", label: "Mis reseñas" },
  { href: "/dashboard/cliente/configuracion", label: "Configuración" },
];

export default async function ClienteChatsPage() {
  const user = await requirePageRole("CLIENT");

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
      title="Mis chats"
      subtitle="Conversa en tiempo real con técnicos para coordinar cada servicio."
      links={clientLinks}
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
            avatarUrl:
              participant.user.clientProfile?.avatarUrl ?? participant.user.technicianProfile?.avatarUrl ?? null,
          })),
          latestMessage: chat.messages[0] ? { content: chat.messages[0].content } : null,
        }))}
      />
    </DashboardShell>
  );
}
