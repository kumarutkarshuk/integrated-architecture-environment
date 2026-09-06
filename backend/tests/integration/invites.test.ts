import http from "node:http";
import WebSocket from "ws";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { attachCanvasWebSocket } from "../../src/canvas/ws.js";
import { clearCanvasPersistenceTimers } from "../../src/canvas/persistence.js";
import { clearCanvasDocs } from "../../src/canvas/yjs-ws-utils.js";
import { prisma } from "../../src/db.js";
import {
  createTestMailer,
  resetMailer,
  setMailer,
} from "../../src/invites/mailer.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);
const testMailer = createTestMailer();

function authHeader(clerkId: string, email: string, displayName?: string) {
  return createTestAuthHeader({ clerkId, email, displayName });
}

function rawToken(clerkId: string, email: string): string {
  return authHeader(clerkId, email).slice("Bearer ".length);
}

function tokenFromInviteUrl(inviteUrl: string): string {
  const url = new URL(inviteUrl);
  const match = url.pathname.match(/^\/invite\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invite URL is not email-bound: ${inviteUrl}`);
  }
  return match[1];
}

async function createProjectAndInvite(options: {
  ownerClerkId: string;
  ownerEmail: string;
  inviteEmail: string;
  projectName?: string;
}) {
  const ownerHeader = authHeader(options.ownerClerkId, options.ownerEmail);

  const created = await request(app)
    .post("/api/projects")
    .set("Authorization", ownerHeader)
    .send({ name: options.projectName ?? "Shared Canvas", mode: "blank" })
    .expect(201);

  await request(app)
    .post(`/api/projects/${created.body.id}/invites`)
    .set("Authorization", ownerHeader)
    .send({ email: options.inviteEmail })
    .expect(201);

  const inviteUrl = testMailer.getSent().at(-1)?.inviteUrl;
  if (!inviteUrl) {
    throw new Error("Invite email was not captured");
  }

  return {
    projectId: created.body.id as string,
    ownerHeader,
    inviteToken: tokenFromInviteUrl(inviteUrl),
  };
}

function createTestServer() {
  const server = http.createServer(app);
  attachCanvasWebSocket(server, testAppConfig);
  return server;
}

async function listen(
  server: http.Server,
): Promise<{ port: number; close: () => Promise<void> }> {
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
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function connectCanvas(port: number, projectId: string, token?: string) {
  const url = new URL(`ws://127.0.0.1:${port}/ws/projects/${projectId}`);
  if (token) {
    url.searchParams.set("token", token);
  }
  return new WebSocket(url);
}

describe("Invite create and redeem", () => {
  beforeEach(() => {
    testMailer.reset();
    setMailer(testMailer.mailer);
  });

  afterEach(() => {
    resetMailer();
    clearCanvasPersistenceTimers();
    clearCanvasDocs();
  });

  it("lets the owner create an Invite by email and send an email-bound link", async () => {
    const header = authHeader("clerk_invite_owner", "owner@example.com", "Owner");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Shared Canvas", mode: "blank" })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", header)
      .send({ email: "editor@example.com" })
      .expect(201);

    expect(response.body).toMatchObject({
      email: "editor@example.com",
      role: "editor",
    });
    expect(response.body.token).toBeUndefined();

    const sent = testMailer.getSent();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "editor@example.com",
      projectName: "Shared Canvas",
    });
    expect(sent[0].inviteUrl).toMatch(
      /^http:\/\/localhost:3000\/invite\/[a-f0-9]{64}$/,
    );
    expect(tokenFromInviteUrl(sent[0].inviteUrl)).toHaveLength(64);
  });

  it("rejects Invite create from a non-owner Collaborator", async () => {
    const ownerHeader = authHeader("clerk_invite_owner2", "owner2@example.com");
    const editorHeader = authHeader("clerk_invite_editor2", "editor2@example.com");

    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", ownerHeader)
      .send({ name: "Owner Only", mode: "blank" })
      .expect(201);

    const owner = await prisma.user.findUnique({
      where: { clerkId: "clerk_invite_owner2" },
    });
    const editor = await prisma.user.upsert({
      where: { clerkId: "clerk_invite_editor2" },
      create: {
        clerkId: "clerk_invite_editor2",
        email: "editor2@example.com",
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
      .post(`/api/projects/${created.body.id}/invites`)
      .set("Authorization", editorHeader)
      .send({ email: "someone@example.com" })
      .expect(403);

    expect(testMailer.getSent()).toHaveLength(0);
  });

  it("lets the matching recipient redeem an Invite as an editor Collaborator", async () => {
    const { projectId, inviteToken } = await createProjectAndInvite({
      ownerClerkId: "clerk_redeem_owner",
      ownerEmail: "redeemowner@example.com",
      inviteEmail: "Editor@example.com",
    });

    const editorHeader = authHeader(
      "clerk_redeem_editor",
      "editor@example.com",
      "Editor",
    );

    const redeemed = await request(app)
      .post(`/api/invites/${inviteToken}/redeem`)
      .set("Authorization", editorHeader)
      .expect(200);

    expect(redeemed.body).toEqual({ projectId });

    const listed = await request(app)
      .get("/api/projects")
      .set("Authorization", editorHeader)
      .expect(200);

    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: projectId, name: "Shared Canvas" }),
      ]),
    );

    const invite = await prisma.projectInvite.findUnique({
      where: { token: inviteToken },
    });
    expect(invite?.redeemedAt).not.toBeNull();

    const editor = await prisma.user.findUnique({
      where: { clerkId: "clerk_redeem_editor" },
    });
    const collaborator = await prisma.collaborator.findUnique({
      where: {
        projectId_userId: { projectId, userId: editor!.id },
      },
    });
    expect(collaborator).toMatchObject({ role: "editor", deletedAt: null });
  });

  it("rejects redeem when Clerk email does not match the Invite", async () => {
    const { projectId, inviteToken } = await createProjectAndInvite({
      ownerClerkId: "clerk_mismatch_owner",
      ownerEmail: "mismatchowner@example.com",
      inviteEmail: "intended@example.com",
    });

    const strangerHeader = authHeader(
      "clerk_mismatch_stranger",
      "stranger@example.com",
    );

    const response = await request(app)
      .post(`/api/invites/${inviteToken}/redeem`)
      .set("Authorization", strangerHeader)
      .expect(403);

    expect(response.body).toEqual({ error: "Email does not match this Invite" });

    const listed = await request(app)
      .get("/api/projects")
      .set("Authorization", strangerHeader)
      .expect(200);

    expect(listed.body).toEqual([]);

    const invite = await prisma.projectInvite.findUnique({
      where: { token: inviteToken },
    });
    expect(invite?.redeemedAt).toBeNull();
    expect(invite?.projectId).toBe(projectId);
  });

  it("lets an invited editor connect to Canvas State over WebSocket", async () => {
    const { projectId, inviteToken } = await createProjectAndInvite({
      ownerClerkId: "clerk_ws_owner",
      ownerEmail: "wsowner@example.com",
      inviteEmail: "wseditor@example.com",
      projectName: "Live Canvas",
    });

    const editorHeader = authHeader("clerk_ws_editor", "wseditor@example.com");

    await request(app)
      .post(`/api/invites/${inviteToken}/redeem`)
      .set("Authorization", editorHeader)
      .expect(200);

    const server = createTestServer();
    const { port, close } = await listen(server);

    try {
      await new Promise<void>((resolve, reject) => {
        const ws = connectCanvas(
          port,
          projectId,
          rawToken("clerk_ws_editor", "wseditor@example.com"),
        );
        let opened = false;
        let settled = false;

        ws.on("open", () => {
          opened = true;
          ws.close();
        });
        ws.on("close", () => {
          if (!settled) {
            settled = true;
            if (opened) {
              resolve();
            } else {
              reject(new Error("WebSocket closed before it opened"));
            }
          }
        });
        ws.on("error", (error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      clearCanvasPersistenceTimers();
      clearCanvasDocs();
      await close();
    }
  });

  it("rejects a User who is not a Collaborator from Canvas State WebSocket", async () => {
    const { projectId } = await createProjectAndInvite({
      ownerClerkId: "clerk_ws_deny_owner",
      ownerEmail: "wsdenyowner@example.com",
      inviteEmail: "wsdenyintended@example.com",
      projectName: "Private Canvas",
    });

    const strangerHeader = authHeader(
      "clerk_ws_stranger",
      "wsstranger@example.com",
    );

    await request(app).get("/api/users/me").set("Authorization", strangerHeader).expect(200);

    const server = createTestServer();
    const { port, close } = await listen(server);

    try {
      await new Promise<void>((resolve, reject) => {
        const ws = connectCanvas(
          port,
          projectId,
          rawToken("clerk_ws_stranger", "wsstranger@example.com"),
        );
        ws.on("open", () => {
          ws.close();
          reject(new Error("Expected WebSocket connection to fail"));
        });
        ws.on("error", () => resolve());
      });
    } finally {
      clearCanvasPersistenceTimers();
      clearCanvasDocs();
      await close();
    }
  });
});
