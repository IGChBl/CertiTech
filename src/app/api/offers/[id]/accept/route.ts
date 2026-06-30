import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { acceptOffer } from "@/lib/offers/service";
import { emitToChat } from "@/lib/realtime/socket";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) return auth.error;

    const { id } = await context.params;

    const result = await acceptOffer(id, auth.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Broadcast the committed offer + linked request state so both participants
    // update immediately: the client can reveal "Pagar ahora", the technician can
    // switch to "Esperando pago del cliente". Reload/API stays the source of truth.
    emitToChat(result.offer.chatId, "offer:update", {
      offerId: result.offer.id,
      chatId: result.offer.chatId,
      status: result.offer.status,
      acceptedAt: result.offer.acceptedAt,
      rejectedAt: result.offer.rejectedAt,
      serviceRequestId: result.offer.serviceRequestId,
      requestStatus: result.offer.requestStatus,
      paymentAvailable: result.paymentAvailable,
    });

    return NextResponse.json({ offer: result.offer, paymentAvailable: result.paymentAvailable });
  } catch (error) {
    console.error("[offers][accept][POST] Error aceptando propuesta", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo aceptar la propuesta en este momento."),
      },
      { status },
    );
  }
}
