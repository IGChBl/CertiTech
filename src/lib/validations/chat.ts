import { z } from "zod";

export const startChatSchema = z.object({
  serviceRequestId: z.string().optional(),
  recipientUserId: z.string().min(10),
});

export const sendMessageSchema = z.object({
  chatId: z.string().min(10),
  content: z.string().min(1).max(3000),
  imageUrl: z.string().url().optional(),
});
