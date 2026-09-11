import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { failGenerateJob, runGenerateJob } from "../../src/ai/generate-service.js";
import {
  createTestJobRunner,
  resetJobRunner,
  setJobRunner,
} from "../../src/ai/job-runner.js";
import { createApp } from "../../src/app.js";
import type { AnalyticsEvent } from "../../src/analytics.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import {
  createTestMailer,
  resetMailer,
  setMailer,
} from "../../src/invites/mailer.js";
import { RESEND_COOLDOWN_MS } from "../../src/invites/service.js";
import { prisma } from "../../src/db.js";
import { testAnalytics } from "../test-analytics.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);
const testMailer = createTestMailer();
const testJobRunner = createTestJobRunner();
const smtpEnvKeys = ["SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;
const previousSmtpEnv = new Map<string, string | undefined>();

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

function eventsNamed(event: AnalyticsEvent["event"]) {
  return testAnalytics.getEvents().filter((item) => item.event === event);
}

function expectEvent(
  event: AnalyticsEvent["event"],
  distinctId: string,
  properties?: Record<string, unknown>,
) {
  const matches = eventsNamed(event);
  expect(matches).toHaveLength(1);
  expect(matches[0]?.distinctId).toBe(distinctId);
  if (properties) {
    expect(matches[0]?.properties).toMatchObject(properties);
  }
}

function expectNoRecipientEmail(email: string) {
  const payload = JSON.stringify({
    events: testAnalytics.getEvents(),
    exceptions: testAnalytics.getExceptions().map((item) => ({
      distinctId: item.distinctId,
      properties: item.properties,
      message: item.error instanceof Error ? item.error.message : String(item.error),
    })),
  });
  expect(payload).not.toContain(email);
}

async function allowResend(inviteId: string) {
  await prisma.projectInvite.update({
    where: { id: inviteId },
    data: { lastSentAt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
  });
}

function useUnconfiguredSmtpMailer() {
  for (const key of smtpEnvKeys) {
    if (!previousSmtpEnv.has(key)) {
      previousSmtpEnv.set(key, process.env[key]);
    }
    delete process.env[key];
  }
  resetMailer();
}

function restoreSmtpEnv() {
  for (const [key, value] of previousSmtpEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  previousSmtpEnv.clear();
}

describe("Product analytics", () => {
  beforeEach(() => {
    testMailer.reset();
    setMailer(testMailer.mailer);
    testJobRunner.reset();
    setJobRunner(testJobRunner.runner);
  });

  afterEach(() => {
    restoreSmtpEnv();
    resetMailer();
    resetJobRunner();
  });

  it("records project_created with blank mode and the Clerk id", async () => {
    const header = authHeader("clerk_analytics_blank", "blank@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Blank Canvas", mode: "blank" })
      .expect(201);

    expectEvent("project_created", "clerk_analytics_blank", {
      mode: "blank",
      projectId: created.body.id,
    });
    expect(eventsNamed("ai_generation_started")).toHaveLength(0);
  });

  it("does not record project_created when name validation fails", async () => {
    const header = authHeader("clerk_analytics_invalid", "invalid@example.com");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "  ", mode: "blank" })
      .expect(400);

    expect(eventsNamed("project_created")).toHaveLength(0);
  });

  it("records project_created in prompt mode and ai_generation_started", async () => {
    const header = authHeader("clerk_analytics_prompt", "prompt@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Prompt Canvas",
        mode: "prompt",
        prompt: "Design a queue",
      })
      .expect(201);

    expectEvent("project_created", "clerk_analytics_prompt", {
      mode: "prompt",
      projectId: created.body.id,
    });
    expectEvent("ai_generation_started", "clerk_analytics_prompt", {
      projectId: created.body.id,
    });
  });

  it("records project_deleted with the Clerk id", async () => {
    const header = authHeader("clerk_analytics_delete", "delete@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Delete Me", mode: "blank" })
      .expect(201);

    await request(app)
      .delete(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(204);

    expectEvent("project_deleted", "clerk_analytics_delete", {
      projectId: created.body.id,
    });
  });

  it("records invite_sent without the recipient email", async () => {
    const header = authHeader("clerk_analytics_invite", "owner@example.com");
    const recipient = "editor@example.com";

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", header)
      .send({ email: recipient })
      .expect(201);

    expectEvent("invite_sent", "clerk_analytics_invite", {
      projectId: created.body.id,
    });
    expectNoRecipientEmail(recipient);
  });

  it("records invite_resent with the Clerk id", async () => {
    const header = authHeader("clerk_analytics_resend", "resend@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    const invited = await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", header)
      .send({ email: "pending@example.com" })
      .expect(201);

    await allowResend(invited.body.id);
    await request(app)
      .post(
        `/api/projects/${created.body.id}/invites/${invited.body.id}/resend`,
      )
      .set("Authorization", header)
      .expect(200);

    expectEvent("invite_resent", "clerk_analytics_resend", {
      projectId: created.body.id,
    });
    expectNoRecipientEmail("pending@example.com");
  });

  it("records invite_redeemed with the recipient Clerk id", async () => {
    const ownerHeader = authHeader("clerk_analytics_redeem_owner", "owner@example.com");
    const editorHeader = authHeader(
      "clerk_analytics_redeem_editor",
      "editor@example.com",
    );

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", ownerHeader)
      .send({ email: "editor@example.com" })
      .expect(201);

    const inviteUrl = testMailer.getSent().at(-1)?.inviteUrl;
    const token = new URL(inviteUrl!).pathname.split("/").at(-1);

    await request(app)
      .post(`/api/invites/${token}/redeem`)
      .set("Authorization", editorHeader)
      .expect(200);

    expectEvent("invite_redeemed", "clerk_analytics_redeem_editor", {
      projectId: created.body.id,
    });
  });

  it("records invite_redeem_failed when the email does not match", async () => {
    const ownerHeader = authHeader(
      "clerk_analytics_mismatch_owner",
      "mismatchowner@example.com",
    );
    const strangerHeader = authHeader(
      "clerk_analytics_mismatch_stranger",
      "stranger@example.com",
    );

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", ownerHeader)
      .send({ email: "intended@example.com" })
      .expect(201);

    const inviteUrl = testMailer.getSent().at(-1)?.inviteUrl;
    const token = new URL(inviteUrl!).pathname.split("/").at(-1);

    await request(app)
      .post(`/api/invites/${token}/redeem`)
      .set("Authorization", strangerHeader)
      .expect(403);

    expectEvent("invite_redeem_failed", "clerk_analytics_mismatch_stranger");
    expect(eventsNamed("invite_redeemed")).toHaveLength(0);
    expectNoRecipientEmail("intended@example.com");
  });

  it("records ai_generation_started when a generate job is queued", async () => {
    const header = authHeader("clerk_analytics_regen", "regen@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Regen Canvas",
        mode: "prompt",
        prompt: "Design v1",
      })
      .expect(201);

    await runGenerateJob(testJobRunner.getEnqueued()[0]!.aiGenerationId);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v2" })
      .expect(201);

    const started = eventsNamed("ai_generation_started");
    expect(started).toHaveLength(2);
    expect(started[1]).toMatchObject({
      distinctId: "clerk_analytics_regen",
      properties: { projectId: created.body.id },
    });
  });

  it("records ai_generation_failed when a generate job fails", async () => {
    const header = authHeader("clerk_analytics_fail", "fail@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Fail Canvas",
        mode: "prompt",
        prompt: "Fail this generate",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await failGenerateJob(jobId);

    expectEvent("ai_generation_failed", "clerk_analytics_fail", {
      projectId: created.body.id,
      aiGenerationId: jobId,
    });
  });

  it("records preview_applied when a Preview is applied", async () => {
    const header = authHeader("clerk_analytics_apply", "apply@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Apply Canvas",
        mode: "prompt",
        prompt: "Design a payment flow",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(jobId);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(200);

    expectEvent("preview_applied", "clerk_analytics_apply", {
      projectId: created.body.id,
      aiGenerationId: jobId,
    });
  });

  it("records spec_exported when an Export Spec job is queued", async () => {
    const header = authHeader("clerk_analytics_export", "export@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Ready Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    expectEvent("spec_exported", "clerk_analytics_export", {
      projectId: created.body.id,
    });
  });

  it("logs Invite mail send failures as errors without the recipient email", async () => {
    const header = authHeader("clerk_analytics_smtp", "smtp@example.com");
    const recipient = "editor@example.com";

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    useUnconfiguredSmtpMailer();

    await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", header)
      .send({ email: recipient })
      .expect(502);

    expect(eventsNamed("invite_sent")).toHaveLength(0);
    expect(testAnalytics.getExceptions()).toHaveLength(1);
    expect(testAnalytics.getExceptions()[0]).toMatchObject({
      distinctId: "clerk_analytics_smtp",
      properties: { source: "api", status: 502 },
    });
    expectNoRecipientEmail(recipient);
  });

  it("logs API 5xx as errors with the Clerk id", async () => {
    const header = authHeader("clerk_analytics_500", "exportfail@example.com");

    setJobRunner({
      async enqueueGenerate() {
        throw new Error("generate should not run for export_spec");
      },
      async enqueueExportSpec() {
        throw new Error("Unauthorized");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Enqueue Fail Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(500);

    expect(eventsNamed("spec_exported")).toHaveLength(0);
    expect(testAnalytics.getExceptions()).toEqual([
      expect.objectContaining({
        distinctId: "clerk_analytics_500",
        properties: { source: "api", status: 500 },
      }),
    ]);
  });
});
