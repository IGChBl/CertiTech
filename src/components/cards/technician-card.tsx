import Link from "next/link";
import { MapPin, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getVerificationColor, getVerificationLabel } from "@/lib/verification-ui";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getSubscriptionPlanBadgeVariant, getSubscriptionPlanLabel } from "@/lib/subscriptions/ui";
import type { SubscriptionPlan } from "@prisma/client";

type TechnicianCardProps = {
  technician: {
    id: string;
    displayName: string;
    businessName?: string | null;
    city: string;
    workZone?: string | null;
    description: string;
    averageRating: number;
    totalReviews: number;
    verification: "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED";
    referencePriceMin?: number | null;
    avatarUrl?: string | null;
    subscriptionPlan: SubscriptionPlan;
    categories: string[];
  };
};

export function TechnicianCard({ technician }: TechnicianCardProps) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={technician.displayName} src={technician.avatarUrl} size={46} />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{technician.displayName}</h3>
            {technician.businessName ? <p className="text-sm text-slate-600">{technician.businessName}</p> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={getSubscriptionPlanBadgeVariant(technician.subscriptionPlan)}>
            Premium {getSubscriptionPlanLabel(technician.subscriptionPlan)}
          </Badge>
          <Badge variant={getVerificationColor(technician.verification)}>
            {getVerificationLabel(technician.verification)}
          </Badge>
        </div>
      </div>

      <RatingStars rating={technician.averageRating} count={technician.totalReviews} />

      <p className="line-clamp-3 text-sm text-slate-600">{technician.description}</p>

      <div className="flex flex-wrap gap-2">
        {technician.categories.slice(0, 3).map((category) => (
          <Badge key={`${technician.id}-${category}`} variant="neutral">
            <Wrench className="mr-1 h-3.5 w-3.5" />
            {category}
          </Badge>
        ))}
      </div>

      <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <MapPin className="h-4 w-4" /> {technician.city}
          {technician.workZone ? ` - ${technician.workZone}` : ""}
        </p>
        <p className="text-sm text-slate-600">Desde {formatCurrency(technician.referencePriceMin)}</p>

        <Link href={`/tecnicos/${technician.id}`} className="block">
          <Button className="w-full">Ver perfil</Button>
        </Link>
      </div>
    </Card>
  );
}
