import { prisma } from "@/lib/prisma";
import { requirePageRole } from "@/lib/auth/page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatPanel } from "@/components/chat/chat-panel";
import { technicianDashboardLinks } from "@/lib/dashboard-links";
import { Card } from "@/components/ui/card";

export default async function TecnicoChatsPage() {
  const user = await requirePageRole("TECHNICIAN");

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
      console.error("[dashboard][tecnico][chats] Error cargando chats", error);
      return { chats: [], hasWarning: true };
    }
  })();

  return (
    <DashboardShell
      title="Chats con clientes"
      subtitle="Responde en tiempo real y coordina los detalles del servicio."
      links={[...technicianDashboardLinks]}
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
