import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { getAdminMetrics } from "@/lib/admin/metrics";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const metrics = await getAdminMetrics();

  return NextResponse.json({
    metrics: {
      totalUsers: metrics.totalUsers,
      totalClients: metrics.totalClients,
      totalTechnicians: metrics.totalTechnicians,
      totalRequests: metrics.totalRequests,
      completedRequests: metrics.completedRequests,
      totalChats: metrics.totalChats,
      totalReviews: metrics.totalReviews,
      activeSubscriptions: metrics.activeSubscriptions,
      recentUsers30Days: metrics.recentUsers30Days,
      topTechnicians: metrics.topTechnicians,
      topCategories: metrics.topCategories,
      recentActivity: metrics.recentActivity,
      hasWarning: metrics.hasWarning,
    },
  });
}
