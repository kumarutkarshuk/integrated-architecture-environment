import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { prisma } from "../../src/db.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

describe("Project CRUD", () => {
  it("creates a blank Project with ready status and owner Collaborator row", async () => {
    const header = authHeader("clerk_owner", "owner@example.com", "Owner");

    const response = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "My Design", mode: "blank" })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: "My Design",
      mode: "blank",
      status: "ready",
    });

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_owner" },
    });
    expect(owner).not.toBeNull();

    const collaborator = await prisma.collaborator.findUnique({
      where: {
        projectId_userId: {
          projectId: response.body.id,
          userId: owner!.id,
        },
      },
    });

    expect(collaborator).toMatchObject({ role: "owner" });
  });

  it("lists Projects the User collaborates on", async () => {
    const header = authHeader("clerk_lister", "lister@example.com");

    await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Listed Project", mode: "blank" })
      .expect(201);

    const response = await request(app)
      .get("/api/projects")
      .set("Authorization", header)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      name: "Listed Project",
      mode: "blank",
      status: "ready",
    });
  });

  it("returns a Project the User can access", async () => {
    const header = authHeader("clerk_getter", "getter@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Get Me", mode: "blank" })
      .expect(201);

    const response = await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      name: "Get Me",
      mode: "blank",
      status: "ready",
    });
  });

  it("returns 404 when a User requests a Project they cannot access", async () => {
    const ownerHeader = authHeader("clerk_proj_owner", "projowner@example.com");
    const strangerHeader = authHeader("clerk_stranger", "stranger@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Private", mode: "blank" })
      .expect(201);

    await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", strangerHeader)
      .expect(404);
  });

  it("allows the owner to delete a Project", async () => {
    const header = authHeader("clerk_deleter", "deleter@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Delete Me", mode: "blank" })
      .expect(201);

    await request(app)
      .delete(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(204);

    const stored = await prisma.project.findUnique({
      where: { id: created.body.id },
    });
    expect(stored).not.toBeNull();
    expect(stored?.deletedAt).not.toBeNull();

    const listed = await request(app)
      .get("/api/projects")
      .set("Authorization", header)
      .expect(200);

    expect(listed.body).toHaveLength(0);

    await request(app)
      .get(`/api/projects/${created.body.id}`)
      .set("Authorization", header)
      .expect(404);
  });

  it("rejects delete from a non-owner Collaborator", async () => {
    const ownerHeader = authHeader("clerk_del_owner", "delowner@example.com");
    const editorHeader = authHeader("clerk_del_editor", "deleditor@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Shared", mode: "blank" })
      .expect(201);

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_del_owner" },
    });
    const editor = await prisma.user.upsert({
      where: { clerkId: "clerk_del_editor" },
      create: {
        clerkId: "clerk_del_editor",
        email: "deleditor@example.com",
      },
      update: {},
    });

    await prisma.collaborator.create({
      data: {
        projectId: created.body.id,
        userId: editor.id,
        role: "editor",
      },
    });

    expect(owner).not.toBeNull();

    await request(app)
      .delete(`/api/projects/${created.body.id}`)
      .set("Authorization", editorHeader)
      .expect(403);

    const stillThere = await prisma.project.findUnique({
      where: { id: created.body.id },
    });
    expect(stillThere).not.toBeNull();
  });
});
