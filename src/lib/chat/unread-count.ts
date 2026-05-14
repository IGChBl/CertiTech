import { prisma } from "@/lib/prisma";

type UnreadCountRow = {
  unread_count: bigint | number;
};

export async function getUnreadMessagesCount(userId: string) {
  const rows = await prisma.$queryRaw<UnreadCountRow[]>`
    SELECT COUNT(*)::bigint AS unread_count
    FROM "Message" m
    INNER JOIN "ChatParticipant" p ON p."chatId" = m."chatId"
    WHERE p."userId" = ${userId}
      AND m."senderId" <> ${userId}
      AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
  `;

  const rawCount = rows[0]?.unread_count ?? 0;

  if (typeof rawCount === "bigint") {
    return Number(rawCount);
  }

  return Number(rawCount);
}
