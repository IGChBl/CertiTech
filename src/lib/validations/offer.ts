import { z } from "zod";

// Amounts are stored as Decimal(12, 2). Keep the API surface to a positive,
// reasonably bounded monetary value. The chat UI sends an integer NIO amount.
export const createOfferSchema = z.object({
  amount: z
    .number()
    .positive("El monto debe ser mayor a cero")
    .max(9_999_999_999.99, "El monto es demasiado alto"),
  description: z.string().trim().max(500).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
