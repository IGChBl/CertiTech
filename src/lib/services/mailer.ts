export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(payload: MailPayload) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[CertiTech][MAIL]", {
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });

    return { ok: true };
  }

  // Implementacion placeholder para proveedor SMTP real.
  // Este punto esta preparado para conectar nodemailer/resend/sendgrid.
  console.log("[CertiTech][MAIL][PROD-PENDING]", payload.subject);
  return { ok: true };
}

