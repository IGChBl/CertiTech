import { z } from "zod";

export const createServiceRequestSchema = z.object({
  title: z.string().min(6, "Título muy corto").max(160),
  categoryId: z.string().min(5, "Categoría requerida"),
  description: z.string().min(20, "Describe mejor el problema").max(2000),
  city: z.string().min(2, "Ciudad requerida"),
  zone: z.string().max(120).optional(),
  locationReference: z.string().max(255).optional(),
  desiredDate: z.string().datetime().optional(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(0).optional(),
  technicianId: z.string().optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

export const updateServiceStatusSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELED"]),
});
