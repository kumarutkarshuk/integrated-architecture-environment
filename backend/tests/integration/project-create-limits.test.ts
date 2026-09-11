import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTestJobRunner,
  resetJobRunner,
  setJobRunner,
} from "../../src/ai/job-runner.js";
import { createApp } from "../../src/app.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { prisma } from "../../src/db.js";
import {
  createTestMailer,
  resetMailer,
  setMailer,
} from "../../src/invites/mailer.js";
import {
  createMemoryProjectCreateRateLimiter,
  setProjectCreateRateLimiter,
} from "../../src/projects/create-quota.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);
const testJobRunner = createTestJobRunner();
const testMailer = createTestMailer();

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

function tokenFromInviteUrl(inviteUrl: string): string {
  const url = new URL(inviteUrl);
  const match = url.pathname.match(/^\/invite\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invite URL is not email-bound: ${inviteUrl}`);
  }
  return match[1];
}

async function createBlankProjects(
  header: string,
  count: number,
  namePrefix: string,
) {
  for (let index = 1; index <= count; index += 1) {
    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: `${namePrefix} ${index}`, mode: "blank" })
      .expect(201);
  }
}

describe("Project name uniqueness", () => {

  it("rejects a second live Project whose name differs only by case", async () => {
    const header = authHeader("clerk_name_case", "namecase@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    expect(created.body.name).toBe("Checkout");

    const clash = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "checkout", mode: "blank" })
      .expect(409);

    expect(clash.body).toEqual({
      error: "A Project with this name already exists",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_name_case" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(1);
  });

  it("trims the name, keeps inner spaces, and stores the trimmed spelling", async () => {
    const header = authHeader("clerk_name_trim", "nametrim@example.com");

    const padded = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "  Check out  ", mode: "blank" })
      .expect(201);

    expect(padded.body.name).toBe("Check out");

    const innerSpace = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    expect(innerSpace.body.name).toBe("Checkout");
  });

  it("lets a different User own a live Project with the same name", async () => {
    const firstHeader = authHeader("clerk_name_a", "namea@example.com");
    const secondHeader = authHeader("clerk_name_b", "nameb@example.com");

    await request(app)
      .post("/api/projects")
      .set("Authorization", firstHeader)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    const other = await request(app)
      .post("/api/projects")
      .set("Authorization", secondHeader)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    expect(other.body.name).toBe("Checkout");
  });

  it("frees the name after a soft-delete so the owner can reuse it", async () => {
    const header = authHeader("clerk_name_reuse", "namereuse@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    await request(app)
      .delete(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(204);

    const reused = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "checkout", mode: "blank" })
      .expect(201);

    expect(reused.body.name).toBe("checkout");
    expect(reused.body.id).not.toBe(created.body.id);
  });

  it("enforces unique live names in the database, not only in app code", async () => {
    const owner = await prisma.user.create({
      data: {
        clerkId: "clerk_name_index",
        email: "nameindex@example.com",
      },
    });

    await prisma.project.create({
      data: {
        name: "Checkout",
        mode: "blank",
        status: "ready",
        ownerId: owner.id,
      },
    });

    await expect(
      prisma.project.create({
        data: {
          name: "checkout",
          mode: "blank",
          status: "ready",
          ownerId: owner.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("Project create daily limit", () => {
  beforeEach(() => {
    testJobRunner.reset();
    setJobRunner(testJobRunner.runner);
    testMailer.reset();
    setMailer(testMailer.mailer);
  });

  afterEach(() => {
    resetJobRunner();
    resetMailer();
  });

  it("rejects the 11th Project create in a UTC day and does not create it", async () => {
    const header = authHeader("clerk_create_limit", "createlimit@example.com");

    await createBlankProjects(header, 10, "Daily");

    const limited = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Daily 11", mode: "blank" })
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily Project create limit reached (10 per day)",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_create_limit" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(10);
  });

  it("does not consume a create on a name clash", async () => {
    const header = authHeader("clerk_clash_quota", "clashquota@example.com");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "checkout", mode: "blank" })
      .expect(409);

    await createBlankProjects(header, 9, "Other");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Other 10", mode: "blank" })
      .expect(429);
  });

  it("does not consume a create on a validation error", async () => {
    const header = authHeader("clerk_valid_quota", "validquota@example.com");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "   ", mode: "blank" })
      .expect(400);

    await createBlankProjects(header, 10, "Valid");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Valid 11", mode: "blank" })
      .expect(429);
  });

  it("still consumes the generate quota on prompt-mode create and creates nothing if that quota fails", async () => {
    const header = authHeader("clerk_prompt_quota", "promptquota@example.com");

    for (let index = 1; index <= 5; index += 1) {
      await request(app)
        .post("/api/projects")
        .set("Authorization", header)
        .send({
          name: `Prompt ${index}`,
          mode: "prompt",
          prompt: `Design v${index}`,
        })
        .expect(201);
    }

    const limited = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Prompt 6",
        mode: "prompt",
        prompt: "Design v6",
      })
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily generate limit reached (5 per day)",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_prompt_quota" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(5);
    expect(testJobRunner.getEnqueued()).toHaveLength(5);
  });

  it("does not consume a create when prompt-mode generate quota fails", async () => {
    const header = authHeader("clerk_gen_no_create", "gennocreate@example.com");

    for (let index = 1; index <= 5; index += 1) {
      await request(app)
        .post("/api/projects")
        .set("Authorization", header)
        .send({
          name: `Prompt ${index}`,
          mode: "prompt",
          prompt: `Design v${index}`,
        })
        .expect(201);
    }

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Prompt 6",
        mode: "prompt",
        prompt: "Design v6",
      })
      .expect(429);

    await createBlankProjects(header, 5, "Blank");

    const limited = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Blank 6", mode: "blank" })
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily Project create limit reached (10 per day)",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_gen_no_create" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(10);
  });

  it("does not consume generate quota when prompt-mode create hits a name clash", async () => {
    const header = authHeader("clerk_prompt_clash", "promptclash@example.com");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Checkout", mode: "blank" })
      .expect(201);

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "checkout",
        mode: "prompt",
        prompt: "Design clash",
      })
      .expect(409);

    for (let index = 1; index <= 5; index += 1) {
      await request(app)
        .post("/api/projects")
        .set("Authorization", header)
        .send({
          name: `Prompt ${index}`,
          mode: "prompt",
          prompt: `Design v${index}`,
        })
        .expect(201);
    }

    expect(testJobRunner.getEnqueued()).toHaveLength(5);
  });

  it("returns the create limit, not the generate limit, when prompt-mode create is over the daily cap", async () => {
    const header = authHeader("clerk_prompt_cap", "promptcap@example.com");

    await createBlankProjects(header, 10, "Blank");

    const limited = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({
        name: "Prompt Extra",
        mode: "prompt",
        prompt: "Design extra",
      })
      .expect(429);

    expect(limited.body).toEqual({
      error: "Daily Project create limit reached (10 per day)",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_prompt_cap" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(10);
    expect(testJobRunner.getEnqueued()).toHaveLength(0);
  });

  it("does not consume a create when joining someone else's Project as an editor", async () => {
    const ownerHeader = authHeader("clerk_join_owner", "joinowner@example.com");
    const editorHeader = authHeader(
      "clerk_join_editor",
      "joineditor@example.com",
    );

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", ownerHeader)
      .send({ email: "joineditor@example.com" })
      .expect(201);

    const inviteUrl = testMailer.getSent().at(-1)?.inviteUrl;
    if (!inviteUrl) {
      throw new Error("Invite email was not captured");
    }

    await request(app)
      .post(`/api/invites/${tokenFromInviteUrl(inviteUrl)}/redeem`)
      .set("Authorization", editorHeader)
      .expect(200);

    await createBlankProjects(editorHeader, 10, "Editor");

    await request(app)
      .post("/api/projects")
      .set("Authorization", editorHeader)
      .send({ name: "Editor 11", mode: "blank" })
      .expect(429);
  });

  it("does not refund a create when a Project is deleted", async () => {
    const header = authHeader("clerk_delete_quota", "deletequota@example.com");

    await createBlankProjects(header, 10, "Keep");

    const listed = await request(app)
      .get("/api/projects")
      .set("Authorization", header)
      .expect(200);

    await request(app)
      .delete(`/api/projects/${listed.body[0].id}`)
      .set("Authorization", header)
      .expect(204);

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "After Delete", mode: "blank" })
      .expect(429);
  });

  it("resets the create quota at UTC midnight and does not cap how many Projects a User owns", async () => {
    let now = new Date("2026-09-06T23:00:00.000Z");
    const dayLimiter = createMemoryProjectCreateRateLimiter({ now: () => now });
    setProjectCreateRateLimiter(dayLimiter.limiter);

    const header = authHeader("clerk_day_roll", "dayroll@example.com");

    await createBlankProjects(header, 10, "Day");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Day 11", mode: "blank" })
      .expect(429);

    now = new Date("2026-09-07T00:00:01.000Z");

    const eleventh = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Day 11", mode: "blank" })
      .expect(201);

    expect(eleventh.body.name).toBe("Day 11");

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_day_roll" },
    });
    const projects = await prisma.project.findMany({
      where: { ownerId: owner!.id, deletedAt: null },
    });
    expect(projects).toHaveLength(11);
  });
});
