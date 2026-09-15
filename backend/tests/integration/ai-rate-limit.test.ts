import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  createTestJobRunner,
  resetJobRunner,
  setJobRunner,
} from "../../src/ai/job-runner.js";
import {
  createMemoryAiRateLimiter,
  setAiRateLimiter,
} from "../../src/ai/rate-limit.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { prisma } from "../../src/db.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);
const testJobRunner = createTestJobRunner();

function authHeader(clerkId: string, email: string) {
  return createTestAuthHeader({ clerkId, email });
}

async function settleGenerateJobs(projectId: string): Promise<void> {
  await prisma.aiGeneration.updateMany({
    where: {
      projectId,
      type: "generate",
      status: { in: ["pending", "running"] },
    },
    data: { status: "completed" },
  });
  await prisma.project.updateMany({
    where: { id: projectId },
    data: { status: "preview" },
  });
}

describe("AI rate limits", () => {
  beforeEach(() => {
    testJobRunner.reset();
    setJobRunner(testJobRunner.runner);
  });

  afterEach(() => {
    resetJobRunner();
  });

  it("rejects the 6th generate in a day with a clear rate-limit error and does not enqueue it", async () => {
    const header = authHeader("clerk_gen_limit", "genlimit@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Rate Limit Project",
        mode: "prompt",
        prompt: "Design v1",
      })
      .expect(201);

    for (let index = 2; index <= 5; index += 1) {
      await settleGenerateJobs(created.body.id);
      await request(app)
        .post(`/api/projects/${created.body.id}/ai/generate`)
        .set("Authorization", header)
        .send({ prompt: `Design v${index}` })
        .expect(201);
    }

    await settleGenerateJobs(created.body.id);
    const limited = await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v6" })
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily generate limit reached (5 per day)",
    });

    const generations = await prisma.aiGeneration.findMany({
      where: { projectId: created.body.id, type: "generate" },
    });
    expect(generations).toHaveLength(5);
    expect(testJobRunner.getEnqueued()).toHaveLength(5);
  });

  it("rejects the 11th export_spec in a day with a clear rate-limit error and does not enqueue it", async () => {
    const header = authHeader("clerk_spec_limit", "speclimit@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Ready Canvas", mode: "blank" })
      .expect(201);

    for (let index = 1; index <= 10; index += 1) {
      await request(app)
        .post(`/api/projects/${created.body.id}/ai/export-spec`)
        .set("Authorization", header)
        .expect(201);
    }

    const limited = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily Export Spec limit reached (10 per day)",
    });

    const generations = await prisma.aiGeneration.findMany({
      where: { projectId: created.body.id, type: "export_spec" },
    });
    expect(generations).toHaveLength(10);
    expect(testJobRunner.getEnqueuedExportSpec()).toHaveLength(10);
  });

  it("counts generate AI Generations across Projects for the same User", async () => {
    const header = authHeader("clerk_gen_global", "genglobal@example.com");

    for (let index = 1; index <= 5; index += 1) {
      await request(app)
        .post("/api/projects")
        .set("Authorization", header)
        .send({
          name: `Project ${index}`,
          mode: "prompt",
          prompt: `Design v${index}`,
        })
        .expect(201);
    }

    const extra = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Project 6",
        mode: "prompt",
        prompt: "Design v6",
      })
      .expect(429);

    expect(extra.body).toEqual({
      error: "Daily generate limit reached (5 per day)",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_gen_global" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(5);
    expect(testJobRunner.getEnqueued()).toHaveLength(5);
  });

  it("counts export_spec AI Generations across Projects for the same User", async () => {
    const header = authHeader("clerk_spec_global", "specglobal@example.com");

    const first = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Canvas A", mode: "blank" })
      .expect(201);

    const second = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Canvas B", mode: "blank" })
      .expect(201);

    for (let index = 1; index <= 6; index += 1) {
      await request(app)
        .post(`/api/projects/${first.body.id}/ai/export-spec`)
        .set("Authorization", header)
        .expect(201);
    }

    for (let index = 1; index <= 4; index += 1) {
      await request(app)
        .post(`/api/projects/${second.body.id}/ai/export-spec`)
        .set("Authorization", header)
        .expect(201);
    }

    const limited = await request(app)
      .post(`/api/projects/${second.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily Export Spec limit reached (10 per day)",
    });
    expect(testJobRunner.getEnqueuedExportSpec()).toHaveLength(10);
  });

  it("lets another User generate when the first User is at the limit", async () => {
    const firstHeader = authHeader("clerk_gen_first", "genfirst@example.com");
    const secondHeader = authHeader("clerk_gen_second", "gensecond@example.com");

    for (let index = 1; index <= 5; index += 1) {
      await request(app)
        .post("/api/projects")
        .set("Authorization", firstHeader)
        .send({
          name: `First ${index}`,
          mode: "prompt",
          prompt: `First v${index}`,
        })
        .expect(201);
    }

    await request(app)
      .post("/api/projects")
      .set("Authorization", firstHeader)
      .send({
        name: "First 6",
        mode: "prompt",
        prompt: "First v6",
      })
      .expect(429);

    await request(app)
      .post("/api/projects")
      .set("Authorization", secondHeader)
      .send({
        name: "Second Project",
        mode: "prompt",
        prompt: "Second design",
      })
      .expect(201);

    expect(testJobRunner.getEnqueued()).toHaveLength(6);
  });

  it("keeps generate and export_spec limits independent", async () => {
    const header = authHeader("clerk_independent", "independent@example.com");

    const promptProject = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Prompt Project",
        mode: "prompt",
        prompt: "Design v1",
      })
      .expect(201);

    for (let index = 2; index <= 5; index += 1) {
      await settleGenerateJobs(promptProject.body.id);
      await request(app)
        .post(`/api/projects/${promptProject.body.id}/ai/generate`)
        .set("Authorization", header)
        .send({ prompt: `Design v${index}` })
        .expect(201);
    }

    await settleGenerateJobs(promptProject.body.id);
    await request(app)
      .post(`/api/projects/${promptProject.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v6" })
      .expect(429);

    const readyProject = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Ready Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${readyProject.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    expect(testJobRunner.getEnqueued()).toHaveLength(5);
    expect(testJobRunner.getEnqueuedExportSpec()).toHaveLength(1);
  });

  it("allows generate again after the UTC day rolls over", async () => {
    let now = new Date("2026-09-06T23:00:00.000Z");
    const dayLimiter = createMemoryAiRateLimiter({ now: () => now });
    setAiRateLimiter(dayLimiter.limiter);

    const header = authHeader("clerk_day_roll", "dayroll@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Day Roll Project",
        mode: "prompt",
        prompt: "Design v1",
      })
      .expect(201);

    for (let index = 2; index <= 5; index += 1) {
      await settleGenerateJobs(created.body.id);
      await request(app)
        .post(`/api/projects/${created.body.id}/ai/generate`)
        .set("Authorization", header)
        .send({ prompt: `Design v${index}` })
        .expect(201);
    }

    await settleGenerateJobs(created.body.id);
    await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v6" })
      .expect(429);

    now = new Date("2026-09-07T00:00:01.000Z");

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v7" })
      .expect(201);

    expect(testJobRunner.getEnqueued()).toHaveLength(6);
  });
});
