import nodemailer from "nodemailer";
import { childLogger } from "../logger.js";

const log = childLogger({ module: "mailer" });

export interface InviteEmail {
  to: string;
  projectName: string;
  inviteUrl: string;
  inviterName: string;
}

export interface Mailer {
  sendInvite(email: InviteEmail): Promise<void>;
}

export const PRODUCT_NAME = "Integrated Architecture Environment (IAE)";

const DEFAULT_SMTP_HOST = "smtp-relay.brevo.com";
const DEFAULT_SMTP_PORT = 587;
const SMTP_REQUIRED_ERROR =
  "SMTP_USER and SMTP_PASS are required to send Invite emails";

export function renderInviteEmail(email: InviteEmail): {
  subject: string;
  html: string;
  text: string;
} {
  const inviter = escapeHtml(email.inviterName);
  const project = escapeHtml(email.projectName);
  const recipient = escapeHtml(email.to);
  const inviteUrl = escapeHtml(email.inviteUrl);

  return {
    subject: `You were invited to ${email.projectName}`,
    html: `<p>You were invited to ${escapeHtml(PRODUCT_NAME)}.</p><p>${inviter} invited you to collaborate on <strong>${project}</strong> as an editor.</p><p>Sign in with ${recipient} to accept this Invite. The link expires in 7 days.</p><p><a href="${inviteUrl}">Open invite</a></p>`,
    text: [
      `You were invited to ${PRODUCT_NAME}.`,
      "",
      `${email.inviterName} invited you to collaborate on ${email.projectName} as an editor.`,
      "",
      `Sign in with ${email.to} to accept this Invite. The link expires in 7 days.`,
      "",
      "Open invite:",
      email.inviteUrl,
    ].join("\n"),
  };
}

export function createTestMailer(): {
  mailer: Mailer;
  getSent: () => InviteEmail[];
  reset: () => void;
} {
  const sent: InviteEmail[] = [];

  return {
    mailer: {
      async sendInvite(email) {
        sent.push(email);
      },
    },
    getSent: () => [...sent],
    reset: () => {
      sent.length = 0;
    },
  };
}

function readSmtpPort(): number {
  const raw = process.env.SMTP_PORT?.trim();
  if (!raw) {
    return DEFAULT_SMTP_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer");
  }
  return port;
}

function createSmtpMailer(options: {
  user: string;
  pass: string;
  fromAddress: string;
  host: string;
  port: number;
}): Mailer {
  const secure = options.port === 465;
  const transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure,
    requireTLS: !secure,
    auth: {
      user: options.user,
      pass: options.pass,
    },
  });

  log.info(
    { host: options.host, port: options.port, secure },
    "SMTP transporter configured",
  );

  return {
    async sendInvite(email) {
      const rendered = renderInviteEmail(email);
      try {
        await transporter.sendMail({
          from: {
            name: PRODUCT_NAME,
            address: options.fromAddress,
          },
          to: email.to,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        log.info("Invite email sent");
      } catch (error) {
        log.error({ err: error }, "Failed to send invite email");
        throw error;
      }
    },
  };
}

function createUnconfiguredMailer(): Mailer {
  return {
    async sendInvite() {
      throw new Error(SMTP_REQUIRED_ERROR);
    },
  };
}

function createMailerFromEnv(): Mailer {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    if (process.env.NODE_ENV === "test") {
      return createUnconfiguredMailer();
    }
    throw new Error("SMTP_USER and SMTP_PASS are required");
  }

  const host = process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST;
  const port = readSmtpPort();

  return createSmtpMailer({
    user,
    pass,
    fromAddress: process.env.SMTP_FROM?.trim() || user,
    host,
    port,
  });
}

let activeMailer: Mailer = createMailerFromEnv();

export function configureMailerFromEnv(): void {
  activeMailer = createMailerFromEnv();
}

export function setMailer(mailer: Mailer): void {
  activeMailer = mailer;
}

export function getMailer(): Mailer {
  return activeMailer;
}

export function resetMailer(): void {
  activeMailer = createMailerFromEnv();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
