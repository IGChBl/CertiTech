import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const chats = await prisma.chat.findMany({
    where: {
      participants: {
        some: {
          userId: auth.user.id,
        },
      },
    },
    include: {
      serviceRequest: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
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
        role: participant.user.roleId,
      })),
      latestMessage: chat.messages[0] ?? null,
      updatedAt: chat.updatedAt,
    })),
  });
}
