import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { prisma } from "../../src/db.js";

const app = createApp({
  port: 4000,
  corsOrigin: "http://localhost:3000",
  clerkSecretKey: "test-secret",
  isTest: true,
});

describe("authenticated workspace", () => {
  it("rejects unauthenticated requests to user and project endpoints", async () => {
    await request(app).get("/api/users/me").expect(401);
    await request(app).get("/api/projects").expect(401);
  });

  it("creates a User on first authenticated request and returns profile", async () => {
    const authHeader = createTestAuthHeader({
      clerkId: "clerk_new_user",
      email: "new@example.com",
      displayName: "New User",
    });

    const response = await request(app)
      .get("/api/users/me")
      .set("Authorization", authHeader)
      .expect(200);

    expect(response.body).toEqual({
      id: expect.any(String),
      email: "new@example.com",
      displayName: "New User",
    });

    const storedUser = await prisma.user.findUnique({
      where: { clerkId: "clerk_new_user" },
    });

    expect(storedUser).toMatchObject({
      email: "new@example.com",
      displayName: "New User",
    });
  });

  it("returns an empty project list for a new User", async () => {
    const authHeader = createTestAuthHeader({
      clerkId: "clerk_empty_projects",
      email: "empty@example.com",
      displayName: "Empty User",
    });

    await request(app)
      .get("/api/users/me")
      .set("Authorization", authHeader)
      .expect(200);

    const response = await request(app)
      .get("/api/projects")
      .set("Authorization", authHeader)
      .expect(200);

    expect(response.body).toEqual([]);
  });
});
