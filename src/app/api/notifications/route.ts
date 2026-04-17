import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);

  if (body?.markAll) {
    await prisma.notification.updateMany({
      where: { userId: auth.user.id, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Todas las notificaciones fueron marcadas" });
  }

  const id = body?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { id, userId: auth.user.id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json({ message: "Notificacion actualizada" });
}
