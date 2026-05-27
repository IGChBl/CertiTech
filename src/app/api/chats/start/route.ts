import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { startChatSchema } from "@/lib/validations/chat";
import {
  getTechnicianSubscriptionRestrictionMessage,
  hasActivePaidSubscription,
  hasTechnicianPoliceRecord,
  POLICE_RECORD_REQUIRED_MESSAGE,
} from "@/lib/subscriptions/service";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const requester = auth.user;
  const requesterHasVerifiedEmail = requester.isEmailVerified;

  if (!requesterHasVerifiedEmail) {
    return NextResponse.json(
      {
        error: "Debes verificar tu correo para iniciar conversaciones en CertiTech.",
      },
      { status: 403 },
    );
  }

  const requesterIsValidatedClient =
    requester.role.code === "CLIENT"
      ? requester.isEmailVerified &&
        !!requester.clientProfile &&
        (requester.clientProfile.verificationStatus === "BASIC_VERIFIED" ||
          requester.clientProfile.verificationStatus === "VERIFIED")
      : true;

  if (!requesterIsValidatedClient) {
    return NextResponse.json(
      {
        error:
          "Tu cuenta está pendiente de verificación. Algunas funciones estarán limitadas hasta completar el proceso.",
      },
      { status: 403 },
    );
  }

  if (requester.role.code === "TECHNICIAN" && requester.technicianProfile) {
    if (!hasTechnicianPoliceRecord(requester.technicianProfile.policeRecordUrl)) {
      return NextResponse.json(
        {
          error: POLICE_RECORD_REQUIRED_MESSAGE,
        },
        { status: 403 },
      );
    }

    const canInitiateAsTechnician = hasActivePaidSubscription({
      subscriptionPlan: requester.technicianProfile.subscriptionPlan,
      subscriptionStatus: requester.technicianProfile.subscriptionStatus,
      subscriptionEndDate: requester.technicianProfile.subscriptionEndDate,
      policeRecordUrl: requester.technicianProfile.policeRecordUrl,
    });

    if (!canInitiateAsTechnician) {
      return NextResponse.json(
        {
          error: getTechnicianSubscriptionRestrictionMessage({
            subscriptionPlan: requester.technicianProfile.subscriptionPlan,
            subscriptionStatus: requester.technicianProfile.subscriptionStatus,
            subscriptionEndDate: requester.technicianProfile.subscriptionEndDate,
          }),
        },
        { status: 403 },
      );
    }
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = startChatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { recipientUserId, serviceRequestId } = parsed.data;

    if (recipientUserId === auth.user.id) {
      return NextResponse.json({ error: "No puedes iniciar chat contigo mismo" }, { status: 400 });
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: {
        id: true,
        status: true,
        isEmailVerified: true,
        role: {
          select: {
            code: true,
          },
        },
        technicianProfile: {
          select: {
            verification: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            subscriptionEndDate: true,
            policeRecordUrl: true,
          },
        },
      },
    });

    if (!recipient || recipient.status !== "ACTIVE" || !recipient.isEmailVerified) {
      return NextResponse.json({ error: "Destinatario no disponible" }, { status: 404 });
    }

    if (recipient.role.code === "TECHNICIAN" && recipient.technicianProfile?.verification !== "VERIFIED") {
      return NextResponse.json({ error: "Solo puedes contactar técnicos verificados." }, { status: 403 });
    }

    if (recipient.role.code === "TECHNICIAN" && recipient.technicianProfile) {
      if (!hasTechnicianPoliceRecord(recipient.technicianProfile.policeRecordUrl)) {
        return NextResponse.json(
          {
            error: "Este técnico aún no tiene récord policial validado para recibir nuevos contactos.",
          },
          { status: 403 },
        );
      }

      const canReceiveContacts = hasActivePaidSubscription({
        subscriptionPlan: recipient.technicianProfile.subscriptionPlan,
        subscriptionStatus: recipient.technicianProfile.subscriptionStatus,
        subscriptionEndDate: recipient.technicianProfile.subscriptionEndDate,
        policeRecordUrl: recipient.technicianProfile.policeRecordUrl,
      });

      if (!canReceiveContacts) {
        return NextResponse.json(
          {
            error: "Este técnico no tiene una suscripción activa para recibir nuevos contactos.",
          },
          { status: 403 },
        );
      }
    }

    let chat = null;

    if (serviceRequestId) {
      chat = await prisma.chat.findUnique({ where: { serviceRequestId } });
    }

    if (!chat) {
      chat = await prisma.chat.findFirst({
        where: {
          serviceRequestId: null,
          participants: {
            some: { userId: auth.user.id },
          },
          AND: {
            participants: {
              some: { userId: recipientUserId },
            },
          },
        },
      });
    }

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          serviceRequestId,
          createdById: auth.user.id,
        },
      });
    }

    await prisma.chatParticipant.createMany({
      data: [
        { chatId: chat.id, userId: auth.user.id },
        { chatId: chat.id, userId: recipientUserId },
      ],
      skipDuplicates: true,
    });

    return NextResponse.json({ chatId: chat.id });
  } catch (error) {
    console.error("[chats][start] Error creando conversación", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo iniciar la conversación en este momento."),
      },
      { status },
    );
  }
}
