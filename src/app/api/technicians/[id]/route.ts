import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isTechnicianPubliclyVisible } from "@/lib/subscriptions/service";

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
          status: true,
          isEmailVerified: true,
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

  if (!technician) {
    return NextResponse.json({ error: "Tecnico no encontrado" }, { status: 404 });
  }

  if (
    !isTechnicianPubliclyVisible({
      verification: technician.verification,
      subscriptionPlan: technician.subscriptionPlan,
      subscriptionStatus: technician.subscriptionStatus,
      subscriptionEndDate: technician.subscriptionEndDate,
      policeRecordUrl: technician.policeRecordUrl,
      userStatus: technician.user.status,
      isEmailVerified: technician.user.isEmailVerified,
    })
  ) {
    return NextResponse.json({ error: "Tecnico no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    technician: {
      id: technician.id,
      userId: technician.userId,
      displayName: technician.displayName,
      businessName: technician.businessName,
      city: technician.city,
      workZone: technician.workZone,
      description: technician.description,
      yearsExperience: technician.yearsExperience,
      availabilityText: technician.availabilityText,
      scheduleText: technician.scheduleText,
      avatarUrl: technician.avatarUrl,
      galleryJson: technician.galleryJson,
      referencePriceMin: technician.referencePriceMin,
      referencePriceMax: technician.referencePriceMax,
      averageRating: technician.averageRating,
      totalReviews: technician.totalReviews,
      completedJobs: technician.completedJobs,
      verification: technician.verification,
      subscriptionPlan: technician.subscriptionPlan,
      subscriptionStatus: technician.subscriptionStatus,
      subscriptionEndDate: technician.subscriptionEndDate,
      featuredUntil: technician.featuredUntil,
      categories: technician.services.map((service) => ({
        id: service.category.id,
        name: service.category.name,
        slug: service.category.slug,
      })),
      reviews: technician.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        clientName: review.client.clientProfile?.fullName ?? "Cliente",
        clientAvatarUrl: review.client.clientProfile?.avatarUrl ?? null,
      })),
    },
  });
}
