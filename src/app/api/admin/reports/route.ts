import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const reports = await prisma.report.findMany({
    include: {
      reporter: {
        include: {
          clientProfile: true,
          technicianProfile: true,
        },
      },
      reportedUser: {
        include: {
          clientProfile: true,
          technicianProfile: true,
        },
      },
      reportedTechnician: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ reports });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const id = body?.id as string | undefined;
  const status = body?.status as "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED" | undefined;
  const resolutionNote = body?.resolutionNote as string | undefined;

  if (!id || !status) {
    return NextResponse.json({ error: "id y status son requeridos" }, { status: 400 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status,
      resolutionNote,
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.adminAction.create({
    data: {
      adminId: auth.user.id,
      actionType: "OTHER",
      targetType: "REPORT",
      targetId: id,
      details: {
        status,
      },
    },
  });

  return NextResponse.json({ report: updated });
}
