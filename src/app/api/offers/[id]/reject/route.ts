import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { decideOffer } from "@/lib/offers/service";
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

    const result = await decideOffer(id, auth.user.id, "REJECTED");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    emitToChat(result.offer.chatId, "offer:update", {
      offerId: result.offer.id,
      chatId: result.offer.chatId,
      status: result.offer.status,
      acceptedAt: result.offer.acceptedAt,
      rejectedAt: result.offer.rejectedAt,
    });

    return NextResponse.json({ offer: result.offer });
  } catch (error) {
    console.error("[offers][reject][POST] Error rechazando propuesta", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo rechazar la propuesta en este momento."),
      },
      { status },
    );
  }
}
