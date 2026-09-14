import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { runGenerateJob } from "../../src/ai/generate-service.js";
import {
  createTestJobRunner,
  resetJobRunner,
  setJobRunner,
} from "../../src/ai/job-runner.js";
import { resetInferenceProvider } from "../../src/ai/inference-provider.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { prisma } from "../../src/db.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);
const testJobRunner = createTestJobRunner();

function authHeader(clerkId: string, email: string) {
  return createTestAuthHeader({ clerkId, email });
}

async function createPromptPreview(options: {
  clerkId: string;
  email: string;
  name: string;
  prompt: string;
}) {
  const header = authHeader(options.clerkId, options.email);
  const created = await request(app)
    .post("/api/projects")
    .set("Authorization", header)
    .send({
      name: options.name,
      mode: "prompt",
      prompt: options.prompt,
    })
    .expect(201);

  const jobId = testJobRunner.getEnqueued().at(-1)!.aiGenerationId;
  await runGenerateJob(jobId);
  return { header, projectId: created.body.id as string, jobId };
}

async function addEditor(projectId: string, clerkId: string, email: string) {
  const header = authHeader(clerkId, email);
  await request(app).get("/api/users/me").set("Authorization", header).expect(200);
  const editor = await prisma.user.findUniqueOrThrow({ where: { clerkId } });
  await prisma.collaborator.create({
    data: {
      projectId,
      userId: editor.id,
      role: "editor",
    },
  });
  return { header, editor };
}

describe("author Ratings on generate and Spec", () => {
  beforeEach(() => {
    testJobRunner.reset();
    setJobRunner(testJobRunner.runner);
  });

  afterEach(() => {
    resetJobRunner();
    resetInferenceProvider();
  });

  it("lets the author set and switch a Rating on a completed generate job", async () => {
    const { header, projectId, jobId } = await createPromptPreview({
      clerkId: "clerk_rate_author",
      email: "rateauthor@example.com",
      name: "Rate Me",
      prompt: "Design a todo API",
    });

    const created = await request(app)
      .put(`/api/projects/${projectId}/ai/${jobId}/rating`)
      .set("Authorization", header)
      .send({ value: "up" })
      .expect(200);

    expect(created.body).toEqual({ value: "up" });

    const previews = await request(app)
      .get(`/api/projects/${projectId}/ai/previews`)
      .set("Authorization", header)
      .expect(200);

    expect(previews.body[0]).toMatchObject({ id: jobId, rating: "up" });

    const switched = await request(app)
      .put(`/api/projects/${projectId}/ai/${jobId}/rating`)
      .set("Authorization", header)
      .send({ value: "down" })
      .expect(200);

    expect(switched.body).toEqual({ value: "down" });

    const job = await request(app)
      .get(`/api/projects/${projectId}/ai/${jobId}`)
      .set("Authorization", header)
      .expect(200);

    expect(job.body.rating).toBe("down");

    const liveRows = await prisma.rating.findMany({
      where: { aiGenerationId: jobId, deletedAt: null },
    });
    expect(liveRows).toHaveLength(1);
    expect(liveRows[0]?.value).toBe("down");
  });

  it("returns 403 when a Collaborator who did not start the job rates it", async () => {
    const { projectId, jobId } = await createPromptPreview({
      clerkId: "clerk_rate_owner",
      email: "rateowner@example.com",
      name: "Shared Rate",
      prompt: "Design a queue",
    });
    const { header: editorHeader } = await addEditor(
      projectId,
      "clerk_rate_editor",
      "rateeditor@example.com",
    );

    await request(app)
      .put(`/api/projects/${projectId}/ai/${jobId}/rating`)
      .set("Authorization", editorHeader)
      .send({ value: "up" })
      .expect(403);

    const previews = await request(app)
      .get(`/api/projects/${projectId}/ai/previews`)
      .set("Authorization", editorHeader)
      .expect(200);

    expect(previews.body[0].id).toBe(jobId);
    expect(previews.body[0]).not.toHaveProperty("rating");
  });

  it("returns 400 when the job is not completed", async () => {
    const header = authHeader("clerk_rate_pending", "ratepending@example.com");
    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Pending Rate",
        mode: "prompt",
        prompt: "Design auth",
      })
      .expect(201);

    const jobId = testJobRunner.getEnqueued()[0]!.aiGenerationId;

    await request(app)
      .put(`/api/projects/${created.body.id}/ai/${jobId}/rating`)
      .set("Authorization", header)
      .send({ value: "up" })
      .expect(400);
  });

  it("returns the applied generate AI Generation after Apply, with null Rating until the author votes", async () => {
    const { header, projectId, jobId } = await createPromptPreview({
      clerkId: "clerk_rate_applied",
      email: "rateapplied@example.com",
      name: "Apply Rate",
      prompt: "Design billing",
    });

    await request(app)
      .get(`/api/projects/${projectId}/ai/applied`)
      .set("Authorization", header)
      .expect(404);

    await request(app)
      .post(`/api/projects/${projectId}/ai/apply`)
      .set("Authorization", header)
      .send({ aiGenerationId: jobId })
      .expect(200);

    const applied = await request(app)
      .get(`/api/projects/${projectId}/ai/applied`)
      .set("Authorization", header)
      .expect(200);

    expect(applied.body).toMatchObject({
      id: jobId,
      type: "generate",
      rating: null,
    });
    expect(applied.body.appliedAt).toBeTruthy();

    const { header: editorHeader } = await addEditor(
      projectId,
      "clerk_rate_applied_editor",
      "rateappliededitor@example.com",
    );

    const editorView = await request(app)
      .get(`/api/projects/${projectId}/ai/applied`)
      .set("Authorization", editorHeader)
      .expect(200);

    expect(editorView.body.id).toBe(jobId);
    expect(editorView.body).not.toHaveProperty("rating");
  });

  it("omits Rating for a second User on the job JSON", async () => {
    const { projectId, jobId } = await createPromptPreview({
      clerkId: "clerk_rate_omit_owner",
      email: "rateomitowner@example.com",
      name: "Omit Rate",
      prompt: "Design search",
    });
    const { header: editorHeader } = await addEditor(
      projectId,
      "clerk_rate_omit_editor",
      "rateomiteditor@example.com",
    );

    const job = await request(app)
      .get(`/api/projects/${projectId}/ai/${jobId}`)
      .set("Authorization", editorHeader)
      .expect(200);

    expect(job.body.id).toBe(jobId);
    expect(job.body).not.toHaveProperty("rating");
  });
});
