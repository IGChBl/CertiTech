-- CreateEnum
CREATE TYPE "public"."ClientVerificationStatus" AS ENUM ('PENDING', 'BASIC_VERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."TechnicianVerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "birthDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ClientProfile"
  ADD COLUMN "identityDocumentNumber" TEXT,
  ADD COLUMN "identityDocumentUrl" TEXT,
  ADD COLUMN "verificationStatus" "public"."ClientVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "public"."TechnicianProfile"
  ADD COLUMN "identityDocumentUrl" TEXT,
  ADD COLUMN "workEvidenceJson" JSONB,
  ADD COLUMN "certificationsJson" JSONB,
  ADD COLUMN "policeRecordUrl" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verifiedById" TEXT;

-- Migrate technician verification enum values
ALTER TABLE "public"."TechnicianProfile" ALTER COLUMN "verification" DROP DEFAULT;

ALTER TABLE "public"."TechnicianProfile"
  ALTER COLUMN "verification" TYPE "public"."TechnicianVerificationStatus"
  USING (
    CASE
      WHEN "verification"::text = 'UNVERIFIED' THEN 'PENDING'
      WHEN "verification"::text = 'IN_REVIEW' THEN 'IN_REVIEW'
      WHEN "verification"::text = 'VERIFIED' THEN 'VERIFIED'
      ELSE 'PENDING'
    END
  )::"public"."TechnicianVerificationStatus";

ALTER TABLE "public"."TechnicianProfile" ALTER COLUMN "verification" SET DEFAULT 'PENDING';

-- Drop obsolete enum
DROP TYPE "public"."VerificationStatus";

-- CreateIndex
CREATE INDEX "ClientProfile_verificationStatus_idx" ON "public"."ClientProfile"("verificationStatus");

-- AddForeignKey
ALTER TABLE "public"."ClientProfile"
  ADD CONSTRAINT "ClientProfile_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechnicianProfile"
  ADD CONSTRAINT "TechnicianProfile_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "public"."User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
