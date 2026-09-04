import http from "node:http";
import WebSocket from "ws";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearCanvasDocs, docs, getYDoc } from "../../src/canvas/yjs-ws-utils.js";
import { clearCanvasPersistenceTimers, configureCanvasPersistence } from "../../src/canvas/persistence.js";
import { readRecordsFromDoc } from "../../src/canvas/snapshot.js";
import { createApp } from "../../src/app.js";
import { runGenerateJob } from "../../src/ai/generate-service.js";
import {
  createTestJobRunner,
  resetJobRunner,
  setJobRunner,
} from "../../src/ai/job-runner.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { attachCanvasWebSocket } from "../../src/canvas/ws.js";
import { prisma } from "../../src/db.js";

const app = createApp({
  port: 4000,
  corsOrigin: "http://localhost:3000",
  clerkSecretKey: "test-secret",
  isTest: true,
});

const testJobRunner = createTestJobRunner();

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

function createTestServer() {
  const server = http.createServer(app);
  attachCanvasWebSocket(server, {
    port: 0,
    corsOrigin: "http://localhost:3000",
    clerkSecretKey: "test-secret",
    isTest: true,
  });
  return server;
}

async function listen(server: http.Server) {
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get server port");
  }
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

describe("AI generation preview and apply", () => {
  beforeEach(() => {
    testJobRunner.reset();
    setJobRunner(testJobRunner.runner);
  });

  afterEach(async () => {
    clearCanvasPersistenceTimers();
    clearCanvasDocs();
    resetJobRunner();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it("creates a prompt-mode Project with generating status and enqueues a generate job", async () => {
    const header = authHeader("clerk_prompt_create", "promptcreate@example.com");

    const response = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Prompt Project",
        mode: "prompt",
        prompt: "Design a todo API",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: "Prompt Project",
      mode: "prompt",
      status: "generating",
    });

    const generation = await prisma.aiGeneration.findFirst({
      where: { projectId: response.body.id },
    });

    expect(generation).toMatchObject({
      type: "generate",
      status: "pending",
      prompt: "Design a todo API",
    });

    expect(testJobRunner.getEnqueued()).toEqual([
      {
        aiGenerationId: generation!.id,
        projectId: response.body.id,
        prompt: "Design a todo API",
      },
    ]);
  });

  it("moves a Project to preview when a generate job completes", async () => {
    const header = authHeader("clerk_preview", "preview@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Preview Project",
        mode: "prompt",
        prompt: "Design a chat service",
      })
      .expect(201);

    const enqueued = testJobRunner.getEnqueued();
    expect(enqueued).toHaveLength(1);

    await runGenerateJob(enqueued[0]!.aiGenerationId);

    const project = await prisma.project.findUnique({
      where: { id: created.body.id },
    });
    expect(project?.status).toBe("preview");

    const previews = await request(app)
      .get(`/api/projects/${created.body.id}/ai/previews`)
      .set("Authorization", header)
      .expect(200);

    expect(previews.body).toHaveLength(1);
    expect(previews.body[0]).toMatchObject({
      prompt: "Design a chat service",
      status: "completed",
      appliedAt: null,
    });
    expect(previews.body[0].result.records["shape:preview-box"]).toBeDefined();
  });

  it("creates a new AI Generation row when the owner regenerates with a tweaked prompt", async () => {
    const header = authHeader("clerk_regen", "regen@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Regen Project",
        mode: "prompt",
        prompt: "Design v1",
      })
      .expect(201);

    await runGenerateJob(testJobRunner.getEnqueued()[0]!.aiGenerationId);

    const regenerate = await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v2 with caching" })
      .expect(201);

    expect(regenerate.body).toMatchObject({
      prompt: "Design v2 with caching",
      status: "pending",
    });

    const project = await prisma.project.findUnique({
      where: { id: created.body.id },
    });
    expect(project?.status).toBe("generating");

    const rows = await prisma.aiGeneration.findMany({
      where: { projectId: created.body.id },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.prompt)).toEqual([
      "Design v1",
      "Design v2 with caching",
    ]);
  });

  it("lists only completed, unapplied generate previews", async () => {
    const header = authHeader("clerk_list_previews", "listpreviews@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "List Previews",
        mode: "prompt",
        prompt: "First preview",
      })
      .expect(201);

    const firstJobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(firstJobId);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Second preview" })
      .expect(201);

    const secondJobId = testJobRunner.getEnqueued()[1]!.aiGenerationId;
    await runGenerateJob(secondJobId);

    const previews = await request(app)
      .get(`/api/projects/${created.body.id}/ai/previews`)
      .set("Authorization", header)
      .expect(200);

    expect(previews.body).toHaveLength(2);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: firstJobId })
      .expect(200);

    const remaining = await request(app)
      .get(`/api/projects/${created.body.id}/ai/previews`)
      .set("Authorization", header)
      .expect(200);

    expect(remaining.body).toHaveLength(1);
    expect(remaining.body[0].id).toBe(secondJobId);
  });

  it("applies a completed preview to the canvas and unlocks the Project", async () => {
    const header = authHeader("clerk_apply", "apply@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Apply Project",
        mode: "prompt",
        prompt: "Design a payment flow",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(jobId);

    const applied = await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(200);

    expect(applied.body).toMatchObject({
      id: created.body.id,
      status: "ready",
    });

    const generation = await prisma.aiGeneration.findUnique({
      where: { id: jobId },
    });
    expect(generation?.appliedAt).not.toBeNull();

    const snapshot = await prisma.canvasSnapshot.findUnique({
      where: { projectId: created.body.id },
    });
    expect(snapshot?.tldrawJson).toEqual({
      records: expect.objectContaining({
        "shape:preview-box": expect.objectContaining({
          typeName: "shape",
        }),
      }),
    });
  });

  it("restores applied preview records from Canvas Snapshot after room rebind", async () => {
    configureCanvasPersistence();

    const header = authHeader("clerk_apply_reload", "applyreload@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Apply Reload",
        mode: "prompt",
        prompt: "Design a reload-safe diagram",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(jobId);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(200);

    const stored = await prisma.canvasSnapshot.findUnique({
      where: { projectId: created.body.id },
    });

    expect(stored?.tldrawJson).toEqual({
      records: expect.objectContaining({
        "shape:preview-box": expect.objectContaining({
          typeName: "shape",
        }),
      }),
    });

    docs.delete(created.body.id);

    const reloaded = getYDoc(created.body.id);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(readRecordsFromDoc(reloaded, created.body.id)).toEqual({
      "shape:preview-box": expect.objectContaining({
        typeName: "shape",
        parentId: "page:page",
      }),
    });
  });

  it("rejects apply when the preview is not completed", async () => {
    const header = authHeader("clerk_apply_pending", "applypending@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Pending Apply",
        mode: "prompt",
        prompt: "Still running",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(400);
  });

  it("rejects apply when the preview belongs to another Project", async () => {
    const ownerHeader = authHeader("clerk_apply_owner", "applyowner@example.com");
    const otherHeader = authHeader("clerk_apply_other", "applyother@example.com");

    const first = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({
        name: "First",
        mode: "prompt",
        prompt: "First project",
      })
      .expect(201);

    const second = await request(app)
      .post("/api/projects")
      .set("Authorization", otherHeader)
      .send({
        name: "Second",
        mode: "prompt",
        prompt: "Second project",
      })
      .expect(201);

    const firstJobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(firstJobId);

    await request(app)
      .post(`/api/projects/${second.body.id}/ai/apply`)
      .set("Authorization", otherHeader)
      .send({ aiGenerationId: firstJobId })
      .expect(404);
  });

  it("rejects apply when the preview has already been applied", async () => {
    const header = authHeader("clerk_apply_twice", "applytwice@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Apply Twice",
        mode: "prompt",
        prompt: "Already applied preview",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(jobId);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(200);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(400);
  });

  it("blocks WebSocket access while a prompt-mode Project is generating or in preview", async () => {
    const header = authHeader("clerk_ws_lock", "wslock@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Locked Project",
        mode: "prompt",
        prompt: "Locked canvas",
      })
      .expect(201);

    const server = createTestServer();
    const { port, close } = await listen(server);
    const wsToken = header.replace("Bearer ", "");

    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(
          `ws://127.0.0.1:${port}/ws/projects/${created.body.id}?token=${encodeURIComponent(wsToken)}`,
        );
        ws.on("open", () => reject(new Error("Expected generating connection to fail")));
        ws.on("error", () => resolve());
      });

      const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
      await runGenerateJob(jobId);

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(
          `ws://127.0.0.1:${port}/ws/projects/${created.body.id}?token=${encodeURIComponent(wsToken)}`,
        );
        ws.on("open", () => reject(new Error("Expected preview connection to fail")));
        ws.on("error", () => resolve());
      });

      await request(app)
        .post(`/api/projects/${created.body.id}/ai/apply`)
        .set("Authorization", header)
        .send({ aiGenerationId: jobId })
        .expect(200);

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(
          `ws://127.0.0.1:${port}/ws/projects/${created.body.id}?token=${encodeURIComponent(wsToken)}`,
        );
        ws.on("open", () => {
          ws.on("close", () => resolve());
          ws.close();
        });
        ws.on("error", () => reject(new Error("Expected ready connection to succeed")));
      });
    } finally {
      await close();
    }
  });
});
