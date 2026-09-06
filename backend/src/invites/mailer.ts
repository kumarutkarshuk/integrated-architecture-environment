export interface InviteEmail {
  to: string;
  projectName: string;
  inviteUrl: string;
}

export interface Mailer {
  sendInvite(email: InviteEmail): Promise<void>;
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

export function createResendMailer(options: {
  apiKey: string;
  from: string;
}): Mailer {
  return {
    async sendInvite(email) {
      const { Resend } = await import("resend");
      const resend = new Resend(options.apiKey);
      const result = await resend.emails.send({
        from: options.from,
        to: email.to,
        subject: `You were invited to ${email.projectName}`,
        html: `<p>You were invited to collaborate on <strong>${escapeHtml(email.projectName)}</strong>.</p><p><a href="${email.inviteUrl}">Open invite</a></p>`,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    },
  };
}

function createUnconfiguredMailer(): Mailer {
  return {
    async sendInvite() {
      throw new Error("RESEND_API_KEY is required to send Invite emails");
    },
  };
}

function createMailerFromEnv(): Mailer {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return createUnconfiguredMailer();
  }

  return createResendMailer({
    apiKey,
    from: process.env.RESEND_FROM_EMAIL ?? "IAE <beth.t@example.com>",
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
