import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { failExportSpecJob, runExportSpecJob } from "../../src/ai/export-spec-service.js";
import { buildGeoShape, toRichText } from "../../src/ai/diagram-records.js";
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
import { replaceRecordsInDoc, upsertCanvasSnapshot } from "../../src/canvas/snapshot.js";
import { clearCanvasDocs, getYDoc } from "../../src/canvas/yjs-ws-utils.js";
import { prisma } from "../../src/db.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);
const testJobRunner = createTestJobRunner();

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

describe("Export Spec job lifecycle", () => {
  beforeEach(() => {
    testJobRunner.reset();
    setJobRunner(testJobRunner.runner);
  });

  afterEach(() => {
    clearCanvasDocs();
    resetJobRunner();
    resetInferenceProvider();
  });

  it("enqueues an export_spec AI Generation on a ready Project", async () => {
    const header = authHeader("clerk_export_enqueue", "exportenqueue@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Ready Canvas", mode: "blank" })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    expect(response.body).toMatchObject({
      status: "pending",
      type: "export_spec",
      result: null,
    });

    const generation = await prisma.aiGeneration.findFirst({
      where: { projectId: created.body.id, type: "export_spec" },
    });

    expect(generation).toMatchObject({
      type: "export_spec",
      status: "pending",
      prompt: null,
      model: "openai/gpt-oss-20b",
    });

    expect(testJobRunner.getEnqueuedExportSpec()).toEqual([
      {
        aiGenerationId: generation!.id,
        projectId: created.body.id,
      },
    ]);
  });

  it("lets the user poll an export_spec job and retrieve markdown and gaps_summary", async () => {
    const header = authHeader("clerk_export_poll", "exportpoll@example.com");

    setInferenceProvider({
      async generate() {
        throw new Error("generate should not run for export_spec");
      },
      async exportSpec() {
        return {
          markdown: "# Checkout Service\n\nAPI Gateway sends requests to Payments.",
          gaps_summary: "Auth is missing from the canvas.",
        };
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Poll Canvas", mode: "blank" })
      .expect(201);

    const started = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    expect(started.body.status).toBe("pending");

    await runExportSpecJob(started.body.id);

    const completed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${started.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(completed.body).toMatchObject({
      id: started.body.id,
      type: "export_spec",
      status: "completed",
      prompt: "The canvas has no shapes.",
      result: {
        markdown: "# Checkout Service\n\nAPI Gateway sends requests to Payments.",
        gaps_summary: "Auth is missing from the canvas.",
      },
    });
  });

  it("uses Canvas Snapshot content when exporting a Spec", async () => {
    const header = authHeader("clerk_export_snapshot", "exportsnapshot@example.com");
    let seenCanvasSummary = "";

    setInferenceProvider({
      async generate() {
        throw new Error("generate should not run for export_spec");
      },
      async exportSpec(canvasSummary) {
        seenCanvasSummary = canvasSummary;
        return {
          markdown: "# Spec from snapshot",
          gaps_summary: "Payments storage is not shown.",
        };
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Snapshot Canvas", mode: "blank" })
      .expect(201);

    await upsertCanvasSnapshot(created.body.id, {
      "shape:api-gateway": buildGeoShape({
        id: "shape:api-gateway",
        label: "API Gateway",
        x: 80,
        y: 80,
        index: "a1",
      }),
      "shape:arrow-charges": {
        id: "shape:arrow-charges",
        typeName: "shape",
        type: "arrow",
        props: {
          richText: toRichText("charges card"),
        },
      },
    });

    const started = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    await runExportSpecJob(started.body.id);

    const completed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${started.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(seenCanvasSummary).toContain("API Gateway");
    expect(seenCanvasSummary).toContain("charges card");
    expect(completed.body.prompt).toContain("API Gateway");
    expect(completed.body.prompt).toContain("charges card");
    expect(completed.body.result).toEqual({
      markdown: "# Spec from snapshot",
      gaps_summary: "Payments storage is not shown.",
    });
  });

  it("prefers live Canvas State over a stale Canvas Snapshot", async () => {
    const header = authHeader("clerk_export_live", "exportlive@example.com");
    let seenCanvasSummary = "";

    setInferenceProvider({
      async generate() {
        throw new Error("generate should not run for export_spec");
      },
      async exportSpec(canvasSummary) {
        seenCanvasSummary = canvasSummary;
        return {
          markdown: "# Spec from live canvas",
          gaps_summary: "No extra gaps.",
        };
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Live Canvas", mode: "blank" })
      .expect(201);

    await upsertCanvasSnapshot(created.body.id, {
      "shape:old-service": buildGeoShape({
        id: "shape:old-service",
        label: "Old Service",
        x: 40,
        y: 40,
        index: "a1",
      }),
    });

    replaceRecordsInDoc(getYDoc(created.body.id), created.body.id, {
      "shape:live-payments": buildGeoShape({
        id: "shape:live-payments",
        label: "Live Payments",
        x: 120,
        y: 80,
        index: "a1",
      }),
    });

    const started = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    await runExportSpecJob(started.body.id);

    expect(seenCanvasSummary).toContain("Live Payments");
    expect(seenCanvasSummary).not.toContain("Old Service");

    const completed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${started.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(completed.body.prompt).toContain("Live Payments");
    expect(completed.body.prompt).not.toContain("Old Service");
  });

  it("rejects Export Spec when the Project is not ready", async () => {
    const header = authHeader("clerk_export_not_ready", "exportnotready@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Generating Project",
        mode: "prompt",
        prompt: "Design a queue",
      })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(400);

    const exportJobs = await prisma.aiGeneration.findMany({
      where: { projectId: created.body.id, type: "export_spec" },
    });
    expect(exportJobs).toHaveLength(0);
  });

  it("hides Export Spec from users who cannot access the Project", async () => {
    const ownerHeader = authHeader("clerk_export_owner", "exportowner@example.com");
    const strangerHeader = authHeader("clerk_export_stranger", "exportstranger@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Private Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", strangerHeader)
      .expect(404);
  });

  it("leaves an export_spec job running when inference fails so the worker can retry", async () => {
    const header = authHeader("clerk_export_retry", "exportretry@example.com");

    setInferenceProvider({
      async generate() {
        throw new Error("generate should not run for export_spec");
      },
      async exportSpec() {
        throw new Error("Groq timeout");
      },
    });

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Retry Export", mode: "blank" })
      .expect(201);

    const started = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    await expect(runExportSpecJob(started.body.id)).rejects.toThrow("Groq timeout");

    const running = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${started.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(running.body.status).toBe("running");

    const project = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(project.body.status).toBe("ready");
  });

  it("marks an export_spec AI Generation failed after the worker reports exhaustion", async () => {
    const header = authHeader("clerk_export_fail", "exportfail@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Fail Export", mode: "blank" })
      .expect(201);

    const started = await request(app)
      .post(`/api/projects/${created.body.id}/ai/export-spec`)
      .set("Authorization", header)
      .expect(201);

    await failExportSpecJob(started.body.id);

    const failed = await request(app)
      .get(`/api/projects/${created.body.id}/ai/${started.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(failed.body.status).toBe("failed");

    const project = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(project.body.status).toBe("ready");
  });
});
