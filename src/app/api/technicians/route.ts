import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicTechnicianWhere } from "@/lib/subscriptions/service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const query = params.get("q")?.trim();
  const city = params.get("city")?.trim();
  const category = params.get("category")?.trim();
  const sort = params.get("sort")?.trim() ?? "relevance";
  const homeService = params.get("homeService")?.trim();
  const minRating = params.get("minRating") ? Number(params.get("minRating")) : undefined;
  const minPrice = params.get("minPrice") ? Number(params.get("minPrice")) : undefined;
  const maxPrice = params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined;

  const where: Record<string, unknown> = buildPublicTechnicianWhere();

  if (query) {
    where.OR = [
      { displayName: { contains: query, mode: "insensitive" } },
      { businessName: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (homeService === "true") {
    where.isHomeService = true;
  }

  if (minRating) {
    where.averageRating = { gte: minRating };
  }

  if (minPrice || maxPrice) {
    where.referencePriceMin = {
      gte: minPrice || 0,
      lte: maxPrice || 99999,
    };
  }

  if (category) {
    where.services = {
      some: {
        OR: [
          { category: { slug: category } },
          { categoryId: category },
        ],
      },
    };
  }

  const rankingOrder = [{ featuredUntil: "desc" as const }, { subscriptionPlan: "desc" as const }];

  const sortOrder =
    sort === "best"
      ? [{ averageRating: "desc" as const }, { totalReviews: "desc" as const }]
      : sort === "new"
        ? [{ createdAt: "desc" as const }]
        : sort === "price_low"
          ? [{ referencePriceMin: "asc" as const }]
          : [{ averageRating: "desc" as const }, { completedJobs: "desc" as const }];

  const orderBy = [...rankingOrder, ...sortOrder];

  const technicians = await prisma.technicianProfile.findMany({
    where,
    include: {
      services: {
        include: {
          category: true,
        },
      },
    },
    orderBy,
    take: 50,
  });

  return NextResponse.json({
    technicians: technicians.map((tech) => ({
      id: tech.id,
      userId: tech.userId,
      displayName: tech.displayName,
      businessName: tech.businessName,
      city: tech.city,
      workZone: tech.workZone,
      description: tech.description,
      yearsExperience: tech.yearsExperience,
      availabilityText: tech.availabilityText,
      avatarUrl: tech.avatarUrl,
      averageRating: tech.averageRating,
      totalReviews: tech.totalReviews,
      completedJobs: tech.completedJobs,
      verification: tech.verification,
      subscriptionPlan: tech.subscriptionPlan,
      subscriptionStatus: tech.subscriptionStatus,
      featuredUntil: tech.featuredUntil,
      isHomeService: tech.isHomeService,
      referencePriceMin: tech.referencePriceMin,
      referencePriceMax: tech.referencePriceMax,
      categories: tech.services.map((service) => service.category.name),
    })),
  });
}
