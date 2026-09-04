import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDiagramPlan } from "../../src/ai/diagram-plan.js";
import { buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";
import { generateDiagramPlanWithGroq } from "../../src/ai/groq-client.js";

describe("parseDiagramPlan", () => {
  it("accepts a valid component list", () => {
    expect(
      parseDiagramPlan({
        components: [
          { id: "api-gateway", label: "API Gateway", x: 100, y: 120 },
          { id: "database", label: "PostgreSQL" },
        ],
      }),
    ).toEqual({
      components: [
        { id: "api-gateway", label: "API Gateway", x: 100, y: 120 },
        { id: "database", label: "PostgreSQL" },
      ],
      connections: [],
    });
  });

  it("accepts connections between known components", () => {
    expect(
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", x: 100, y: 100 },
          { id: "queue", label: "Queue", x: 400, y: 100 },
        ],
        connections: [{ from: "api", to: "queue", label: "enqueue job" }],
      }),
    ).toEqual({
      components: [
        { id: "api", label: "API", x: 100, y: 100 },
        { id: "queue", label: "Queue", x: 400, y: 100 },
      ],
      connections: [{ from: "api", to: "queue", label: "enqueue job" }],
    });
  });

  it("rejects duplicate component ids", () => {
    expect(() =>
      parseDiagramPlan({
        components: [
          { id: "cache", label: "Cache" },
          { id: "cache", label: "Cache 2" },
        ],
      }),
    ).toThrow(/Duplicate component id/);
  });
});

describe("buildRecordsFromDiagramPlan", () => {
  it("builds valid tldraw geo records with auto layout", () => {
    const result = buildRecordsFromDiagramPlan({
      components: [
        { id: "api", label: "API" },
        { id: "db", label: "Database" },
      ],
      connections: [{ from: "api", to: "db" }],
    });

    expect(Object.keys(result.records)).toEqual([
      "shape:api",
      "shape:db",
      "shape:arrow-api-to-db",
      "binding:api-to-db-start",
      "binding:api-to-db-end",
    ]);
    expect(result.records["shape:api"]).toMatchObject({
      typeName: "shape",
      type: "geo",
      parentId: "page:page",
      rotation: 0,
      x: 120,
      props: expect.objectContaining({
        geo: "rectangle",
        richText: expect.any(Object),
      }),
    });
    expect(result.records["shape:db"]).toMatchObject({
      x: 520,
    });
  });

  it("builds arrow shapes and bindings for connections", () => {
    const result = buildRecordsFromDiagramPlan({
      components: [
        { id: "api", label: "API", x: 100, y: 100, w: 200, h: 80 },
        { id: "worker", label: "Worker", x: 400, y: 100, w: 200, h: 80 },
      ],
      connections: [{ from: "api", to: "worker", label: "enqueue" }],
    });

    expect(result.records["shape:arrow-api-to-worker"]).toMatchObject({
      typeName: "shape",
      type: "arrow",
      props: expect.objectContaining({
        kind: "elbow",
        arrowheadEnd: "arrow",
      }),
    });
    expect(result.records["binding:api-to-worker-start"]).toMatchObject({
      typeName: "binding",
      type: "arrow",
      toId: "shape:api",
      props: expect.objectContaining({ terminal: "start" }),
    });
    expect(result.records["binding:api-to-worker-end"]).toMatchObject({
      typeName: "binding",
      type: "arrow",
      toId: "shape:worker",
      props: expect.objectContaining({ terminal: "end" }),
    });
  });
});

describe("generateDiagramPlanWithGroq", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a Groq chat completion response and captures token usage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  components: [{ id: "worker", label: "Worker" }],
                  connections: [],
                }),
              },
            },
          ],
          usage: { total_tokens: 128 },
        }),
        { status: 200 },
      ),
    );

    const result = await generateDiagramPlanWithGroq("Design a worker queue", {
      apiKey: "test-key",
      model: "openai/gpt-oss-20b",
    });

    expect(result).toEqual({
      plan: {
        components: [{ id: "worker", label: "Worker" }],
        connections: [],
      },
      tokensUsed: 128,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("throws when Groq returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), {
        status: 401,
      }),
    );

    await expect(
      generateDiagramPlanWithGroq("Design anything", {
        apiKey: "bad-key",
        model: "openai/gpt-oss-20b",
      }),
    ).rejects.toThrow("Invalid API key");
  });
});
