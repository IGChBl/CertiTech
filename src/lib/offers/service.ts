import { Prisma, OfferStatus, ServiceRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ServiceRequest states from which an accepted offer may bridge into payment.
// Anything else (IN_PROGRESS / COMPLETED / CANCELED / already AWAITING_PAYMENT)
// is rejected so we never overwrite an in-flight or already-priced request.
const PRE_PAYMENT_STATES: ServiceRequestStatus[] = [
  ServiceRequestStatus.PENDING,
  ServiceRequestStatus.ACCEPTED,
];

// Shared offer projection: carries the linked ServiceRequest status so the UI can
// decide whether to surface "Pagar ahora" without a second round-trip.
const offerWithRequestSelect = {
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
  serviceRequestId: true,
  serviceRequest: { select: { status: true, payment: { select: { status: true } } } },
} satisfies Prisma.OfferSelect;

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
  offer: { select: offerWithRequestSelect },
} satisfies Prisma.MessageSelect;

type MessageWithOffer = Prisma.MessageGetPayload<{ select: typeof messageWithOfferSelect }>;
type SerializableOffer = Prisma.OfferGetPayload<{ select: typeof offerWithRequestSelect }>;

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
    // serviceRequestId is null when the chat has no linked ServiceRequest — such
    // an offer can be accepted for negotiation but never bridges into payment.
    serviceRequestId: offer.serviceRequestId,
    requestStatus: offer.serviceRequest?.status ?? null,
    // null until the linked request is paid; drives the in-chat paid wording.
    paymentStatus: offer.serviceRequest?.payment?.status ?? null,
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

type AcceptResult =
  | { ok: true; offer: ReturnType<typeof serializeOffer>; paymentAvailable: boolean }
  | { ok: false; status: number; error: string };

// Controlled validation failure inside the accept transaction. Throwing rolls the
// whole transaction back; the catch maps it to an HTTP status + message.
class OfferBridgeError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "OfferBridgeError";
  }
}

/**
 * Reject an offer with race/double-click safety:
 *  - only the intended client may decide,
 *  - only a SENT offer can transition (final states never revert),
 *  - the conditional updateMany acts as a guard so concurrent/repeated calls
 *    after the first one resolve to a no-op (count === 0).
 */
export async function rejectOffer(offerId: string, userId: string): Promise<DecideResult> {
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

  const updateResult = await prisma.offer.updateMany({
    where: { id: offerId, status: OfferStatus.SENT },
    data: { status: OfferStatus.REJECTED, rejectedAt: new Date() },
  });

  if (updateResult.count === 0) {
    return { ok: false, status: 409, error: "Esta oferta ya fue respondida" };
  }

  const updated = await prisma.offer.findUniqueOrThrow({
    where: { id: offerId },
    select: offerWithRequestSelect,
  });

  return { ok: true, offer: serializeOffer(updated) };
}

/**
 * Accept an offer and, when it is validly linked to a ServiceRequest, bridge it
 * into the existing simulation-only payment module — all inside one transaction
 * so the offer and request transition atomically (or not at all).
 *
 * Guarantees:
 *  - only the intended client may accept (also blocks the technician);
 *  - only a SENT offer transitions; the conditional updateMany makes concurrent
 *    or repeated clicks resolve to a no-op (the loser rolls back);
 *  - the linked request must belong to the same client + technician and sit in an
 *    allowed pre-payment state; the conditional request update prevents a later
 *    click from overwriting an already-priced request;
 *  - a decimal offer amount that the integer-NIO payment module cannot represent
 *    is rejected with a controlled error instead of being silently rounded;
 *  - no Payment row is created here — the existing /pago flow does that later.
 *
 * Offers without a linked ServiceRequest still accept (for negotiation) but report
 * paymentAvailable: false and never touch a request.
 */
export async function acceptOffer(offerId: string, userId: string): Promise<AcceptResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        select: {
          id: true,
          clientId: true,
          status: true,
          amount: true,
          description: true,
          serviceRequestId: true,
          technicianProfileId: true,
          technicianProfile: { select: { userId: true } },
        },
      });

      if (!offer) throw new OfferBridgeError(404, "Oferta no encontrada");
      if (offer.clientId !== userId) {
        throw new OfferBridgeError(403, "No autorizado para responder esta oferta");
      }
      if (offer.status !== OfferStatus.SENT) {
        throw new OfferBridgeError(409, "Esta oferta ya fue respondida");
      }

      // The payment module stores integer NIO. Never round silently: if the offer
      // carries cents the existing module can't represent, refuse before doing
      // anything else (applies to both the linked and the auto-created paths).
      const amountNumber = Number(offer.amount);
      if (!Number.isInteger(amountNumber) || amountNumber <= 0) {
        throw new OfferBridgeError(
          422,
          "El monto de la oferta tiene decimales no soportados por el módulo de pago actual.",
        );
      }

      let paymentAvailable = false;
      // When the accepted offer has no linked ServiceRequest (direct chat), we
      // create one here so the in-chat payment flow has something to pay for and
      // the paid service later surfaces in the client's history.
      let createdRequestId: string | null = null;

      if (offer.serviceRequestId) {
        const serviceRequest = await tx.serviceRequest.findUnique({
          where: { id: offer.serviceRequestId },
          select: { id: true, clientId: true, technicianId: true, status: true },
        });

        if (!serviceRequest) {
          throw new OfferBridgeError(409, "La solicitud vinculada ya no existe.");
        }
        if (serviceRequest.clientId !== offer.clientId) {
          throw new OfferBridgeError(403, "La solicitud no corresponde a este cliente.");
        }
        if (
          !serviceRequest.technicianId ||
          serviceRequest.technicianId !== offer.technicianProfile.userId
        ) {
          throw new OfferBridgeError(403, "La solicitud no corresponde a este técnico.");
        }
        if (!PRE_PAYMENT_STATES.includes(serviceRequest.status)) {
          throw new OfferBridgeError(
            409,
            "La solicitud no está en un estado válido para iniciar el pago.",
          );
        }

        // Conditional update: only transitions from an allowed pre-payment state,
        // so a later concurrent accept can never overwrite agreedPrice/status.
        const requestUpdate = await tx.serviceRequest.updateMany({
          where: { id: serviceRequest.id, status: { in: PRE_PAYMENT_STATES } },
          data: { status: ServiceRequestStatus.AWAITING_PAYMENT, agreedPrice: amountNumber },
        });
        if (requestUpdate.count === 0) {
          throw new OfferBridgeError(
            409,
            "La solicitud cambió de estado. Actualiza e inténtalo de nuevo.",
          );
        }

        paymentAvailable = true;
      } else {
        // Direct chat with no prior ServiceRequest: synthesize one from the chat
        // context so the offer can bridge into payment. Category comes from the
        // technician's services (fallback: any active category); city from the
        // client profile (fallback: technician city).
        const technicianService = await tx.technicianService.findFirst({
          where: { technicianId: offer.technicianProfileId, isActive: true },
          select: { categoryId: true },
        });
        const fallbackCategory = technicianService
          ? null
          : await tx.serviceCategory.findFirst({
              where: { isActive: true },
              select: { id: true },
            });
        const categoryId = technicianService?.categoryId ?? fallbackCategory?.id;
        if (!categoryId) {
          throw new OfferBridgeError(
            409,
            "No hay una categoría de servicio disponible para registrar el pago.",
          );
        }

        const [clientProfile, technicianProfile] = await Promise.all([
          tx.clientProfile.findUnique({
            where: { userId: offer.clientId },
            select: { city: true },
          }),
          tx.technicianProfile.findUnique({
            where: { id: offer.technicianProfileId },
            select: { city: true },
          }),
        ]);
        const city = clientProfile?.city ?? technicianProfile?.city ?? "No especificada";

        const title = offer.description?.trim().slice(0, 120) || "Servicio acordado por chat";
        const description =
          offer.description?.trim() || "Servicio acordado mediante el chat de CertiTech.";

        const createdRequest = await tx.serviceRequest.create({
          data: {
            clientId: offer.clientId,
            technicianId: offer.technicianProfile.userId,
            categoryId,
            title,
            description,
            city,
            status: ServiceRequestStatus.AWAITING_PAYMENT,
            agreedPrice: amountNumber,
            isDirectRequest: true,
          },
          select: { id: true },
        });
        createdRequestId = createdRequest.id;
        paymentAvailable = true;
      }

      // Offer guard: only one SENT→ACCEPTED transition wins. When we synthesized a
      // request above, link it to the offer in the same guarded write.
      const offerUpdate = await tx.offer.updateMany({
        where: { id: offerId, status: OfferStatus.SENT },
        data: {
          status: OfferStatus.ACCEPTED,
          acceptedAt: new Date(),
          ...(createdRequestId ? { serviceRequestId: createdRequestId } : {}),
        },
      });
      if (offerUpdate.count === 0) {
        throw new OfferBridgeError(409, "Esta oferta ya fue respondida");
      }

      const updated = await tx.offer.findUniqueOrThrow({
        where: { id: offerId },
        select: offerWithRequestSelect,
      });

      return { offer: serializeOffer(updated), paymentAvailable };
    });

    return { ok: true, offer: result.offer, paymentAvailable: result.paymentAvailable };
  } catch (error) {
    if (error instanceof OfferBridgeError) {
      return { ok: false, status: error.httpStatus, error: error.message };
    }
    throw error;
  }
}
