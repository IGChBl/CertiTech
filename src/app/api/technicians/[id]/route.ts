import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const technician = await prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      services: {
        include: {
          category: true,
        },
      },
      reviews: {
        where: { isHidden: false },
        include: {
          client: {
            include: {
              clientProfile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!technician || technician.user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Tecnico no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    technician: {
      ...technician,
      reviews: technician.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        clientName: review.client.clientProfile?.fullName ?? "Cliente",
      })),
    },
  });
}
