import http from "node:http";
import WebSocket from "ws";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearCanvasDocs, docs, getYDoc } from "../../src/canvas/yjs-ws-utils.js";
import { clearCanvasPersistenceTimers, configureCanvasPersistence } from "../../src/canvas/persistence.js";
import { readRecordsFromDoc } from "../../src/canvas/snapshot.js";
import { createApp } from "../../src/app.js";
import { runGenerateJob, failGenerateJob } from "../../src/ai/generate-service.js";
import { InvalidDiagramPlanError } from "../../src/ai/diagram-plan.js";
import { buildGeoShape, buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";
import {
  createTestJobRunner,
  resetJobRunner,
  setJobRunner,
} from "../../src/ai/job-runner.js";
import {
  resetInferenceProvider,
  setInferenceProvider,
} from "../../src/ai/inference-provider.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { attachCanvasWebSocket } from "../../src/canvas/ws.js";
import { prisma } from "../../src/db.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);

const testJobRunner = createTestJobRunner();

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

function createTestServer() {
  const server = http.createServer(app);
  attachCanvasWebSocket(server, testAppConfig);
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
    resetInferenceProvider();
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

    await request(app)
      .get(`/api/projects/${response.body.id}/ai/previews`)
      .set("Authorization", header)
      .expect(200)
      .expect([]);

    const generation = await prisma.aiGeneration.findFirst({
      where: { projectId: response.body.id },
    });

    expect(generation).toMatchObject({
      type: "generate",
      status: "pending",
      prompt: "Design a todo API",
      model: "openai/gpt-oss-20b",
      promptVersion: "generate-diagram.v2",
      provider: "groq",
    });

    expect(testJobRunner.getEnqueued()).toEqual([
      {
        aiGenerationId: generation!.id,
        projectId: response.body.id,
        prompt: "Design a todo API",
      },
    ]);
  });

  it("keeps AI Generation rows when a Project is deleted", async () => {
    const header = authHeader("clerk_del_audit", "delaudit@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Audit Me",
        mode: "prompt",
        prompt: "Design a queue",
      })
      .expect(201);

    const before = await prisma.aiGeneration.findMany({
      where: { projectId: created.body.id },
    });
    expect(before).toHaveLength(1);

    await request(app)
      .delete(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(204);

    const generations = await prisma.aiGeneration.findMany({
      where: { projectId: created.body.id },
    });
    expect(generations).toHaveLength(1);
    expect(generations[0]?.deletedAt).toBeNull();
    expect(generations[0]?.prompt).toBe("Design a queue");
    expect(generations[0]?.model).toBe("openai/gpt-oss-20b");
    expect(generations[0]?.promptVersion).toBe("generate-diagram.v2");
    expect(generations[0]?.provider).toBe("groq");

    const project = await prisma.project.findUnique({
      where: { id: created.body.id },
    });
    expect(project?.deletedAt).not.toBeNull();
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

  it("leaves an AI Generation running when inference fails so the worker can retry", async () => {
    const header = authHeader("clerk_retry_job", "retryjob@example.com");

    setInferenceProvider({
      async generate() {
        throw new Error("Groq timeout");
      },
      async exportSpec() {
        throw new Error("export_spec should not run for generate");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Retry Project",
        mode: "prompt",
        prompt: "Retry this generate",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;

    await expect(runGenerateJob(jobId)).rejects.toThrow("Groq timeout");

    const running = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(running.body.status).toBe("running");

    const stillGenerating = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(stillGenerating.body.status).toBe("generating");

    resetInferenceProvider();
    await runGenerateJob(jobId);

    const completed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(completed.body.status).toBe("completed");

    const preview = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(preview.body.status).toBe("preview");
  });

  it("marks an AI Generation failed after the worker reports exhaustion", async () => {
    const header = authHeader("clerk_fail_job", "failjob@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Fail Project",
        mode: "prompt",
        prompt: "Fail this generate",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;

    await failGenerateJob(jobId);

    const failed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(failed.body.status).toBe("failed");

    const project = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(project.body.status).toBe("failed");
  });

  it("keeps Project status preview when a later generate job fails", async () => {
    const header = authHeader("clerk_fail_keep_preview", "failkeep@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Keep Preview Project",
        mode: "prompt",
        prompt: "Design v1",
      })
      .expect(201);

    await runGenerateJob(testJobRunner.getEnqueued()[0]!.aiGenerationId);

    const regenerate = await request(app)
      .post(`/api/projects/${created.body.id}/ai/generate`)
      .set("Authorization", header)
      .send({ prompt: "Design v2" })
      .expect(201);

    await failGenerateJob(regenerate.body.id);

    const project = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(project.body.status).toBe("preview");
  });

  it("stores the Plan and traces on a completed generate AI Generation", async () => {
    const header = authHeader("clerk_plan_store", "planstore@example.com");
    const plan = {
      components: [
        { id: "web", label: "Web", kind: "client" as const },
        { id: "api", label: "API", kind: "service" as const },
      ],
      connections: [{ from: "web", to: "api", style: "sync" as const, label: "request" }],
    };
    const generated = buildRecordsFromDiagramPlan(plan);

    setInferenceProvider({
      async generate() {
        return { ...generated, plan };
      },
      async exportSpec() {
        throw new Error("export_spec should not run for generate");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Plan Project",
        mode: "prompt",
        prompt: "Design a web API",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(jobId);

    const stored = await prisma.aiGeneration.findUnique({
      where: { id: jobId },
    });

    expect(stored).toMatchObject({
      status: "completed",
      promptVersion: "generate-diagram.v2",
      provider: "groq",
      plan,
      result: { records: generated.records },
    });

    const polled = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(polled.body).toMatchObject({
      promptVersion: "generate-diagram.v2",
      provider: "groq",
      plan,
    });

    const previews = await request(app)
      .get(`/api/projects/${created.body.id}/ai/previews`)
      .set("Authorization", header)
      .expect(200);

    expect(previews.body[0]).toMatchObject({
      promptVersion: "generate-diagram.v2",
      provider: "groq",
    });
    expect(previews.body[0].plan).toBeUndefined();
  });

  it("retries an invalid Plan once, then the worker can mark the AI Generation failed", async () => {
    const header = authHeader("clerk_bad_plan", "badplan@example.com");
    let inferenceCalls = 0;

    setInferenceProvider({
      async generate() {
        inferenceCalls += 1;
        throw new InvalidDiagramPlanError("unknown kind");
      },
      async exportSpec() {
        throw new Error("export_spec should not run for generate");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Bad Plan Project",
        mode: "prompt",
        prompt: "Design anything",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await expect(runGenerateJob(jobId)).rejects.toThrow("unknown kind");

    const firstAttempt = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(firstAttempt.body).toMatchObject({
      status: "running",
      promptVersion: "generate-diagram.v2",
      provider: "groq",
      plan: null,
    });
    expect(inferenceCalls).toBe(1);

    await expect(runGenerateJob(jobId)).rejects.toThrow("unknown kind");
    expect(inferenceCalls).toBe(2);

    await failGenerateJob(jobId);

    const failed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(failed.body).toMatchObject({
      status: "failed",
      promptVersion: "generate-diagram.v2",
      provider: "groq",
      plan: null,
    });

    const project = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(project.body.status).toBe("failed");
  });

  it("leaves generate running when inference returns records without a Plan so the worker can retry", async () => {
    const header = authHeader("clerk_missing_plan", "missingplan@example.com");
    let inferenceCalls = 0;

    setInferenceProvider({
      async generate() {
        inferenceCalls += 1;
        return {
          records: {
            "shape:orphan": buildGeoShape({
              id: "shape:orphan",
              label: "Orphan",
              x: 0,
              y: 0,
              index: "a1",
            }),
          },
        };
      },
      async exportSpec() {
        throw new Error("export_spec should not run for generate");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Missing Plan",
        mode: "prompt",
        prompt: "Need a plan",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await expect(runGenerateJob(jobId)).rejects.toThrow("Generate result is missing a Plan");

    expect(inferenceCalls).toBe(1);

    const running = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(running.body.status).toBe("running");
    expect(running.body.plan).toBeNull();
  });

  it("applies the stored tldraw records instead of rebuilding from the Plan", async () => {
    const header = authHeader("clerk_apply_records", "applyrecords@example.com");
    const storedRecords = {
      "shape:stored-preview": buildGeoShape({
        id: "shape:stored-preview",
        label: "Stored Preview",
        x: 40,
        y: 60,
        index: "a1",
        color: "red",
      }),
    };

    setInferenceProvider({
      async generate() {
        return {
          records: storedRecords,
          plan: {
            components: [{ id: "api", label: "API", kind: "service" }],
            connections: [],
          },
        };
      },
      async exportSpec() {
        throw new Error("export_spec should not run for generate");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Apply Records",
        mode: "prompt",
        prompt: "Keep stored records",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;
    await runGenerateJob(jobId);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(200);

    const snapshot = await prisma.canvasSnapshot.findUnique({
      where: { projectId: created.body.id },
    });

    expect(snapshot?.tldrawJson).toEqual({
      records: expect.objectContaining({
        "shape:stored-preview": expect.objectContaining({
          typeName: "shape",
          props: expect.objectContaining({ color: "red" }),
        }),
      }),
    });
    expect(
      (snapshot?.tldrawJson as { records: Record<string, unknown> }).records["shape:api"],
    ).toBeUndefined();
  });
});
