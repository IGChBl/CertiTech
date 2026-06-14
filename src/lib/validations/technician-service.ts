import { z } from "zod";

export const upsertTechnicianServiceSchema = z.object({
  categoryId: z.string().min(5, "Categoría requerida"),
  title: z.string().min(3, "Título muy corto").max(100),
  description: z.string().max(1000).optional().nullable(),
  basePrice: z.number().int().min(0, "El precio no puede ser negativo").optional().nullable(),
  isActive: z.boolean().default(true),
});
