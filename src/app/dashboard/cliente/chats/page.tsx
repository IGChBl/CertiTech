import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Card } from "@/components/ui/card";

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

  const { chats, hasWarning } = await (async () => {
    try {
      const data = await prisma.chat.findMany({
        where: {
          participants: {
            some: { userId: user.id },
          },
        },
        select: {
          id: true,
          participants: {
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  clientProfile: {
                    select: {
                      fullName: true,
                      avatarUrl: true,
                    },
                  },
                  technicianProfile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return { chats: data, hasWarning: false };
    } catch (error) {
      console.error("[dashboard][cliente][chats] Error cargando chats", error);
      return { chats: [], hasWarning: true };
    }
  })();

  return (
    <DashboardShell
      title="Mis chats"
      subtitle="Conversa en tiempo real con técnicos para coordinar cada servicio."
      links={clientLinks}
    >
      {hasWarning ? (
        <Card>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No se pudieron cargar algunos datos temporalmente. Intenta recargar la página.
          </p>
        </Card>
      ) : null}

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
