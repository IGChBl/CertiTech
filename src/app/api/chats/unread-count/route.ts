import { NextResponse } from "next/server";
import { getCurrentSessionPayload } from "@/lib/auth/session";
import { getUnreadMessagesCount } from "@/lib/chat/unread-count";
import { isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function GET() {
  const session = await getCurrentSessionPayload();

  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (session.role === "ADMIN") {
    return NextResponse.json({ unreadCount: 0 });
  }

  try {
    const unreadCount = await getUnreadMessagesCount(session.userId);
    return NextResponse.json({ unreadCount });
  } catch (error) {
    if (isPrismaConnectionTimeoutError(error)) {
      console.warn("[chats][unread-count] Timeout temporal de conexión");
      return NextResponse.json({ unreadCount: 0 });
    }

    console.error("[chats][unread-count] Error contando mensajes no leídos", error);
    return NextResponse.json({ unreadCount: 0 });
  }
}
