import { prisma } from "@/lib/prisma";

type RecentRequestActivity = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
};

type RecentReportActivity = {
  id: string;
  reason: string;
  status: string;
  createdAt: Date;
};

type TopTechnicianMetric = {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  reviews: number;
};

type TopCategoryMetric = {
  categoryId: string;
  categoryName: string;
  total: number;
};

export type AdminMetricsResult = {
  totalUsers: number;
  totalClients: number;
  totalTechnicians: number;
  totalRequests: number;
  completedRequests: number;
  totalChats: number;
  totalReviews: number;
  activeSubscriptions: number;
  recentUsers30Days: number;
  topTechnicians: TopTechnicianMetric[];
  topCategories: TopCategoryMetric[];
  recentActivity: {
    requests: RecentRequestActivity[];
    reports: RecentReportActivity[];
  };
  hasWarning: boolean;
};

export const adminMetricsFallback: AdminMetricsResult = {
  totalUsers: 0,
  totalClients: 0,
  totalTechnicians: 0,
  totalRequests: 0,
  completedRequests: 0,
  totalChats: 0,
  totalReviews: 0,
  activeSubscriptions: 0,
  recentUsers30Days: 0,
  topTechnicians: [],
  topCategories: [],
  recentActivity: {
    requests: [],
    reports: [],
  },
  hasWarning: true,
};

export async function getAdminMetrics(): Promise<AdminMetricsResult> {
  try {
    const [
      totalUsers,
      totalClients,
      totalTechnicians,
      totalRequests,
      completedRequests,
      totalChats,
      totalReviews,
      activeSubscriptions,
      recentUsers30Days,
      topTechniciansRaw,
      categoriesUsage,
      recentRequests,
      recentReports,
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { role: { code: "CLIENT" } } }),
      prisma.user.count({ where: { role: { code: "TECHNICIAN" } } }),
      prisma.serviceRequest.count(),
      prisma.serviceRequest.count({ where: { status: "COMPLETED" } }),
      prisma.chat.count(),
      prisma.review.count(),
      prisma.technicianProfile.count({
        where: {
          subscriptionStatus: "ACTIVE",
          subscriptionPlan: { in: ["MONTHLY", "YEARLY"] },
        },
      }),
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
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          averageRating: true,
          totalReviews: true,
        },
      }),
      prisma.serviceRequest.groupBy({
        by: ["categoryId"],
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: "desc" } },
        take: 5,
      }),
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

    const categoryIds = categoriesUsage.map((item) => item.categoryId);
    const categories = categoryIds.length
      ? await prisma.serviceCategory.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [];

    const categoriesMap = new Map(categories.map((category) => [category.id, category.name]));

    return {
      totalUsers,
      totalClients,
      totalTechnicians,
      totalRequests,
      completedRequests,
      totalChats,
      totalReviews,
      activeSubscriptions,
      recentUsers30Days,
      topTechnicians: topTechniciansRaw.map((tech) => ({
        id: tech.id,
        name: tech.displayName,
        avatarUrl: tech.avatarUrl,
        rating: tech.averageRating,
        reviews: tech.totalReviews,
      })),
      topCategories: categoriesUsage.map((item) => {
        const groupedCount =
          typeof item._count === "object" && item._count !== null ? (item._count.categoryId ?? 0) : 0;

        return {
          categoryId: item.categoryId,
          categoryName: categoriesMap.get(item.categoryId) ?? "Categoría",
          total: groupedCount,
        };
      }),
      recentActivity: {
        requests: recentRequests,
        reports: recentReports,
      },
      hasWarning: false,
    };
  } catch (error) {
    console.error("[admin][metrics] Error cargando métricas", error);
    return adminMetricsFallback;
  }
}
