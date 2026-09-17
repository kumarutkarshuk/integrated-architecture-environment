import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBrevoApiMailer,
  PRODUCT_NAME,
  renderInviteEmail,
} from "../../src/invites/mailer.js";

describe("createBrevoApiMailer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs rendered invite content to Brevo", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(null, { status: 201 });
    });
    const mailer = createBrevoApiMailer({
      apiKey: "test-api-key",
      fromAddress: "hello@example.com",
      fetchImpl,
    });

    const invite = {
      to: "editor@example.com",
      projectName: "Shared Canvas",
      inviteUrl: "https://app.example.com/invite/token",
      inviterName: "Owner",
    };
    const rendered = renderInviteEmail(invite);

    await mailer.sendInvite(invite);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(capturedUrl).toBe("https://api.brevo.com/v3/smtp/email");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers).toMatchObject({
      accept: "application/json",
      "content-type": "application/json",
      "api-key": "test-api-key",
    });
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      sender: { name: PRODUCT_NAME, email: "hello@example.com" },
      to: [{ email: "editor@example.com" }],
      subject: rendered.subject,
      htmlContent: rendered.html,
      textContent: rendered.text,
    });
  });

  it("throws when Brevo returns a non-success status", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("invalid sender", { status: 400 }),
    );
    const mailer = createBrevoApiMailer({
      apiKey: "test-api-key",
      fromAddress: "hello@example.com",
      fetchImpl,
    });

    await expect(
      mailer.sendInvite({
        to: "editor@example.com",
        projectName: "P",
        inviteUrl: "https://app.example.com/invite/t",
        inviterName: "Owner",
      }),
    ).rejects.toThrow("Brevo API returned 400");
  });
});
