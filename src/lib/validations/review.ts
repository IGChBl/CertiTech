import { z } from "zod";

export const createReviewSchema = z.object({
  serviceRequestId: z.string().min(10),
  technicianProfileId: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(900).optional(),
});
