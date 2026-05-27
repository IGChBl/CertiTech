import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: auth.user.id,
          },
        },
      },
      select: {
        id: true,
        updatedAt: true,
        serviceRequest: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        participants: {
          select: {
            user: {
              select: {
                id: true,
                roleId: true,
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
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      chats: chats.map((chat) => ({
        id: chat.id,
        serviceRequest: chat.serviceRequest,
        participants: chat.participants.map((participant) => ({
          userId: participant.user.id,
          name:
            participant.user.clientProfile?.fullName ??
            participant.user.technicianProfile?.displayName ??
            participant.user.email,
          avatarUrl:
            participant.user.clientProfile?.avatarUrl ?? participant.user.technicianProfile?.avatarUrl ?? null,
          role: participant.user.roleId,
        })),
        latestMessage: chat.messages[0] ?? null,
        updatedAt: chat.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[chats][list] Error cargando conversaciones", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        chats: [],
        error: getPrismaFriendlyErrorMessage(error, "No se pudieron cargar los chats en este momento."),
      },
      { status },
    );
  }
}
