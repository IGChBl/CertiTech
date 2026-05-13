import { NextResponse } from "next/server";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { canTechnicianReceiveNewLeads, getTechnicianSubscriptionRestrictionMessage } from "@/lib/subscriptions/service";

type GuardSnapshot = {
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: Date | null;
  policeRecordUrl?: string | null;
};

export function requireTechnicianSubscriptionAccess(snapshot: GuardSnapshot) {
  if (canTechnicianReceiveNewLeads(snapshot)) {
    return { error: null as NextResponse | null };
  }

  return {
    error: NextResponse.json(
      {
        error: getTechnicianSubscriptionRestrictionMessage(snapshot),
      },
      { status: 403 },
    ),
  };
}
