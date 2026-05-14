import { prisma } from "@/lib/prisma";

export async function markChatAsRead(chatId: string, userId: string, readAt = new Date()) {
  await prisma.$transaction([
    prisma.chatParticipant.updateMany({
      where: {
        chatId,
        userId,
      },
      data: {
        lastReadAt: readAt,
      },
    }),
    prisma.message.updateMany({
      where: {
        chatId,
        senderId: {
          not: userId,
        },
      },
      data: {
        isRead: true,
        readAt,
      },
    }),
  ]);

  return readAt;
}
