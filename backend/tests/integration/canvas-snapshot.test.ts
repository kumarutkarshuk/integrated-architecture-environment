import http from "node:http";
import WebSocket from "ws";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { clearCanvasDocs, docs, getYDoc } from "../../src/canvas/yjs-ws-utils.js";
import { clearCanvasPersistenceTimers } from "../../src/canvas/persistence.js";
import { createApp } from "../../src/app.js";
import { createTestAuthHeader } from "../../src/auth/test-token-verifier.js";
import { configureCanvasPersistence } from "../../src/canvas/persistence.js";
import {
  getCanvasYArrayName,
  readRecordsFromDoc,
  upsertCanvasSnapshot,
} from "../../src/canvas/snapshot.js";
import { attachCanvasWebSocket } from "../../src/canvas/ws.js";
import { prisma } from "../../src/db.js";

const app = createApp({
  port: 4000,
  corsOrigin: "http://localhost:3000",
  clerkSecretKey: "test-secret",
  isTest: true,
});

function authHeader(clerkId: string, email: string) {
  return createTestAuthHeader({ clerkId, email });
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

async function listen(server: http.Server): Promise<{ port: number; close: () => Promise<void> }> {
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

describe("Canvas Snapshot", () => {
  afterEach(() => {
    clearCanvasPersistenceTimers();
    clearCanvasDocs();
  });

  it("restores Canvas Snapshot records into Yjs state on room bind", async () => {
    configureCanvasPersistence();

    const header = authHeader("clerk_snapshot", "snapshot@example.com");
    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Snapshot Project", mode: "blank" })
      .expect(201);

    const records = {
      "shape:test": { id: "shape:test", typeName: "shape", type: "geo" },
    };

    await upsertCanvasSnapshot(created.body.id, records);

    const doc = getYDoc(created.body.id);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(readRecordsFromDoc(doc, created.body.id)).toEqual(records);
  });

  it("persists Canvas Snapshot after debounced Yjs updates", async () => {
    configureCanvasPersistence();

    const header = authHeader("clerk_persist", "persist@example.com");
    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Persist Project", mode: "blank" })
      .expect(201);

    const doc = getYDoc(created.body.id);
    const yArray = doc.getArray<{ key: string; val: unknown }>(
      getCanvasYArrayName(created.body.id),
    );

    doc.transact(() => {
      yArray.push([
        {
          key: "shape:persisted",
          val: { id: "shape:persisted", typeName: "shape", type: "geo" },
        },
      ]);
    });

    await new Promise((resolve) => setTimeout(resolve, 2200));

    const stored = await prisma.canvasSnapshot.findUnique({
      where: { projectId: created.body.id },
    });

    expect(stored?.tldrawJson).toEqual({
      records: {
        "shape:persisted": {
          id: "shape:persisted",
          typeName: "shape",
          type: "geo",
        },
      },
    });
  });

  it("round-trips Canvas Snapshot through debounced save and room rebind", async () => {
    configureCanvasPersistence();

    const header = authHeader("clerk_roundtrip", "roundtrip@example.com");
    const created = await request(app)
      .post("/api/projects")
      .set("Authorization", header)
      .send({ name: "Roundtrip Project", mode: "blank" })
      .expect(201);

    const doc = getYDoc(created.body.id);
    const yArray = doc.getArray<{ key: string; val: unknown }>(
      getCanvasYArrayName(created.body.id),
    );

    doc.transact(() => {
      yArray.push([
        {
          key: "shape:roundtrip",
          val: { id: "shape:roundtrip", typeName: "shape", type: "geo" },
        },
      ]);
    });

    await new Promise((resolve) => setTimeout(resolve, 2200));
    docs.delete(created.body.id);

    const reloaded = getYDoc(created.body.id);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(readRecordsFromDoc(reloaded, created.body.id)).toEqual({
      "shape:roundtrip": {
        id: "shape:roundtrip",
        typeName: "shape",
        type: "geo",
      },
    });
  });

  it("rejects unauthenticated WebSocket connections", async () => {
    const server = createTestServer();
    const { port, close } = await listen(server);

    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(
          `ws://127.0.0.1:${port}/ws/projects/some-project-id`,
        );
        ws.on("open", () => reject(new Error("Expected connection to fail")));
        ws.on("error", () => resolve());
      });
    } finally {
      await close();
    }
  });
});
