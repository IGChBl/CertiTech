import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const [
    totalUsers,
    totalClients,
    totalTechnicians,
    totalRequests,
    completedRequests,
    totalChats,
    totalReviews,
    recentUsers,
    topTechnicians,
    categoriesUsage,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: { code: "CLIENT" } } }),
    prisma.user.count({ where: { role: { code: "TECHNICIAN" } } }),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: "COMPLETED" } }),
    prisma.chat.count(),
    prisma.review.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        },
      },
    }),
    prisma.technicianProfile.findMany({
      where: { totalReviews: { gt: 0 } },
      orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
      take: 5,
      include: {
        user: { select: { id: true, email: true } },
      },
    }),
    prisma.serviceRequest.groupBy({
      by: ["categoryId"],
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 5,
    }),
  ]);

  const categoryIds = categoriesUsage.map((item) => item.categoryId);
  const categories = await prisma.serviceCategory.findMany({ where: { id: { in: categoryIds } } });

  const categoriesMap = new Map(categories.map((category) => [category.id, category.name]));

  const activity = await Promise.all([
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, reason: true, status: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    metrics: {
      totalUsers,
      totalClients,
      totalTechnicians,
      totalRequests,
      completedRequests,
      totalChats,
      totalReviews,
      recentUsers30Days: recentUsers,
      topTechnicians: topTechnicians.map((tech) => ({
        id: tech.id,
        name: tech.displayName,
        rating: tech.averageRating,
        reviews: tech.totalReviews,
      })),
      topCategories: categoriesUsage.map((item) => ({
        categoryId: item.categoryId,
        categoryName: categoriesMap.get(item.categoryId) ?? "Categoria",
        total: item._count.categoryId,
      })),
      recentActivity: {
        requests: activity[0],
        reports: activity[1],
      },
    },
  });
}
