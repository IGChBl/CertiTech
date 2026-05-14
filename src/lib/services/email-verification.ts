import { prisma } from "@/lib/prisma";
import { generateSecureToken } from "@/lib/services/token";
import { sendMail } from "@/lib/services/mailer";

type VerificationEmailContext = {
  fullName?: string | null;
  accountType: "cliente" | "tecnico";
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

export async function createEmailVerificationToken(userId: string) {
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function getEmailVerificationLink(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/verificar-correo?token=${token}`;
}

function buildVerificationEmailHtml(verificationLink: string, context: VerificationEmailContext) {
  const name = context.fullName?.trim() || "Hola";
  const accountLabel = context.accountType === "tecnico" ? "técnico" : "cliente";

  return `
  <div style="font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <h1 style="margin: 0 0 12px; font-size: 24px; color: #0f172a;">CertiTech</h1>
      <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">${name}, gracias por registrarte como ${accountLabel}.</p>
      <p style="margin: 0 0 20px; font-size: 14px; color: #334155;">Para activar tu cuenta, confirma tu correo haciendo clic en el siguiente botón:</p>
      <a href="${verificationLink}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 11px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;">
        Verificar correo
      </a>
      <p style="margin: 20px 0 8px; font-size: 12px; color: #64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="margin: 0; font-size: 12px; word-break: break-all; color: #334155;">${verificationLink}</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="margin: 0; font-size: 12px; color: #64748b;">Este enlace expira en 24 horas.</p>
    </div>
  </div>`;
}

export async function sendVerificationEmail(params: {
  userId: string;
  email: string;
  context: VerificationEmailContext;
}) {
  const { token } = await createEmailVerificationToken(params.userId);
  const verificationLink = getEmailVerificationLink(token);
  const html = buildVerificationEmailHtml(verificationLink, params.context);

  const result = await sendMail({
    to: params.email,
    subject: "Verifica tu correo en CertiTech",
    text: `Confirma tu correo aquí: ${verificationLink}`,
    html,
  });

  return result;
}

export async function verifyEmailToken(token: string) {
  const verification = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!verification) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (verification.usedAt || verification.expiresAt < new Date()) {
    return { ok: false as const, reason: "expired" as const };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: verification.userId },
    select: {
      id: true,
      role: {
        select: {
          code: true,
        },
      },
      clientProfile: {
        select: {
          id: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!targetUser) {
    return { ok: false as const, reason: "invalid" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUser.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.deleteMany({
      where: { userId: targetUser.id },
    });

    if (targetUser.role.code === "CLIENT" && targetUser.clientProfile?.verificationStatus === "PENDING") {
      await tx.clientProfile.update({
        where: { id: targetUser.clientProfile.id },
        data: {
          verificationStatus: "BASIC_VERIFIED",
          verifiedAt: new Date(),
          verificationNote: "Verificación básica por correo completada.",
        },
      });
    }
  });

  return { ok: true as const };
}
