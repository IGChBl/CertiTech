import { z } from "zod";

export const upsertCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  icon: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
  isActive: z.boolean().optional(),
});
