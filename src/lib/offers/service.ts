import { Prisma, OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Shared select so the messages GET endpoint and the offer create endpoint
// return/emit an identical message + offer shape to the client.
export const messageWithOfferSelect = {
  id: true,
  chatId: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  isRead: true,
  sender: {
    select: {
      id: true,
      email: true,
      clientProfile: { select: { fullName: true, avatarUrl: true } },
      technicianProfile: { select: { displayName: true, avatarUrl: true } },
    },
  },
  offer: {
    select: {
      id: true,
      chatId: true,
      status: true,
      amount: true,
      currency: true,
      description: true,
      clientId: true,
      technicianProfileId: true,
      messageId: true,
      acceptedAt: true,
      rejectedAt: true,
    },
  },
} satisfies Prisma.MessageSelect;

type MessageWithOffer = Prisma.MessageGetPayload<{ select: typeof messageWithOfferSelect }>;

type SerializableOffer = {
  id: string;
  chatId: string;
  status: OfferStatus;
  amount: Prisma.Decimal;
  currency: string;
  description: string | null;
  clientId: string;
  technicianProfileId: string;
  messageId: string | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
};

export function serializeOffer(offer: SerializableOffer) {
  return {
    id: offer.id,
    chatId: offer.chatId,
    status: offer.status,
    amount: Number(offer.amount),
    currency: offer.currency,
    description: offer.description,
    clientId: offer.clientId,
    technicianProfileId: offer.technicianProfileId,
    messageId: offer.messageId,
    acceptedAt: offer.acceptedAt,
    rejectedAt: offer.rejectedAt,
  };
}

export function serializeMessageWithOffer(message: MessageWithOffer) {
  return {
    id: message.id,
    chatId: message.chatId,
    content: message.content,
    imageUrl: message.imageUrl,
    createdAt: message.createdAt,
    isRead: message.isRead,
    sender: {
      id: message.sender.id,
      name:
        message.sender.clientProfile?.fullName ??
        message.sender.technicianProfile?.displayName ??
        message.sender.email,
      avatarUrl:
        message.sender.clientProfile?.avatarUrl ??
        message.sender.technicianProfile?.avatarUrl ??
        null,
    },
    offer: message.offer ? serializeOffer(message.offer) : null,
  };
}

type DecideResult =
  | { ok: true; offer: ReturnType<typeof serializeOffer> }
  | { ok: false; status: number; error: string };

/**
 * Accept or reject an offer with race/double-click safety:
 *  - only the intended client may decide,
 *  - only a SENT offer can transition (final states never revert),
 *  - the conditional updateMany acts as a guard so concurrent/repeated calls
 *    after the first one resolve to a no-op (count === 0).
 */
export async function decideOffer(
  offerId: string,
  userId: string,
  decision: "ACCEPTED" | "REJECTED",
): Promise<DecideResult> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { id: true, clientId: true, status: true },
  });

  if (!offer) {
    return { ok: false, status: 404, error: "Oferta no encontrada" };
  }

  // Only the client the offer was directed to may respond. This also blocks the
  // technician from deciding their own offer.
  if (offer.clientId !== userId) {
    return { ok: false, status: 403, error: "No autorizado para responder esta oferta" };
  }

  if (offer.status !== OfferStatus.SENT) {
    return { ok: false, status: 409, error: "Esta oferta ya fue respondida" };
  }

  const now = new Date();
  const updateResult = await prisma.offer.updateMany({
    where: { id: offerId, status: OfferStatus.SENT },
    data:
      decision === "ACCEPTED"
        ? { status: OfferStatus.ACCEPTED, acceptedAt: now }
        : { status: OfferStatus.REJECTED, rejectedAt: now },
  });

  if (updateResult.count === 0) {
    return { ok: false, status: 409, error: "Esta oferta ya fue respondida" };
  }

  const updated = await prisma.offer.findUniqueOrThrow({
    where: { id: offerId },
    select: {
      id: true,
      chatId: true,
      status: true,
      amount: true,
      currency: true,
      description: true,
      clientId: true,
      technicianProfileId: true,
      messageId: true,
      acceptedAt: true,
      rejectedAt: true,
    },
  });

  return { ok: true, offer: serializeOffer(updated) };
}
