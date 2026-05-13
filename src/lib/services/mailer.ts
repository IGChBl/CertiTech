import nodemailer from "nodemailer";

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type MailProvider = "console" | "smtp" | "resend";
type MailResult =
  | { ok: true; provider: MailProvider; messageId?: string }
  | { ok: false; provider: MailProvider; error: string };

function getMailProvider(): MailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "console")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();

  if (provider === "smtp" || provider === "resend" || provider === "console") {
    return provider;
  }

  console.warn(`[MAIL] EMAIL_PROVIDER inválido "${provider}". Se usará "console".`);
  return "console";
}

function getMailFrom() {
  const raw = (process.env.MAIL_FROM ?? "CertiTech <no-reply@certitech.app>").trim();
  return raw.replace(/\[([^\]]+)\]\(mailto:[^)]+\)/i, "<$1>");
}

async function sendWithResend(payload: MailPayload) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getMailFrom(),
      to: [payload.to],
      subject: payload.subject,
      html: payload.html ?? `<p>${payload.text}</p>`,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend error ${response.status}: ${body || "sin detalle"}`);
  }
}

async function sendWithSmtp(payload: MailPayload) {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !portRaw || !user || !pass) {
    throw new Error("Configuración SMTP incompleta. Revisa SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.");
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT inválido. Debe ser un número de puerto válido.");
  }

  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  console.log("[MAIL][SMTP] Sending email", {
    to: payload.to,
    subject: payload.subject,
    host,
    port,
    secure,
  });

  const info = await transporter.sendMail({
    from: getMailFrom(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html ?? `<p>${payload.text}</p>`,
  });

  console.log("[MAIL][SMTP] Sent successfully", {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  });

  return info.messageId;
}

export async function sendMail(payload: MailPayload): Promise<MailResult> {
  const provider = getMailProvider();

  if (provider === "console") {
    console.log("[CertiTech][MAIL][CONSOLE]", {
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
    return { ok: true, provider };
  }

  try {
    if (provider === "resend") {
      await sendWithResend(payload);
      return { ok: true, provider };
    }

    const messageId = await sendWithSmtp(payload);
    return { ok: true, provider, messageId };
  } catch (error) {
    if (provider === "smtp") {
      console.error("[MAIL][SMTP][ERROR]", error);
    } else {
      console.error("[CertiTech][MAIL][ERROR]", error);
    }

    return {
      ok: false,
      provider,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

