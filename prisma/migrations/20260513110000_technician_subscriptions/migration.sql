-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');

-- AlterTable
ALTER TABLE "TechnicianProfile"
ADD COLUMN     "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredUntil" TIMESTAMP(3),
ADD COLUMN     "lastPaymentDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TechnicianProfile_subscriptionStatus_idx" ON "TechnicianProfile"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "TechnicianProfile_subscriptionPlan_idx" ON "TechnicianProfile"("subscriptionPlan");

-- CreateIndex
CREATE INDEX "TechnicianProfile_subscriptionEndDate_idx" ON "TechnicianProfile"("subscriptionEndDate");

