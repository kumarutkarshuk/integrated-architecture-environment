import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidInferenceJsonError, parseDiagramPlan } from "../../src/ai/diagram-plan.js";
import { buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";
import { generateDiagramPlanWithGroq } from "../../src/ai/groq-client.js";

describe("parseDiagramPlan", () => {
  it("accepts a valid component list and ignores LLM geometry", () => {
    expect(
      parseDiagramPlan({
        components: [
          {
            id: "api-gateway",
            label: "API Gateway",
            kind: "service",
            x: 100,
            y: 120,
            w: 400,
            h: 50,
            color: "red",
            shape: "ellipse",
          },
          { id: "database", label: "PostgreSQL", kind: "store" },
        ],
      }),
    ).toEqual({
      components: [
        { id: "api-gateway", label: "API Gateway", kind: "service" },
        { id: "database", label: "PostgreSQL", kind: "store" },
      ],
      connections: [],
    });
  });

  it("maps kind and style aliases then keeps canonical values", () => {
    expect(
      parseDiagramPlan({
        components: [
          { id: "web", label: "Web", kind: "frontend" },
          { id: "api", label: "API", kind: "ui" },
          { id: "pg", label: "Postgres", kind: "database" },
          { id: "cache", label: "Cache", kind: "db" },
          { id: "files", label: "Files", kind: "s3" },
          { id: "archive", label: "Archive", kind: "blob" },
          { id: "events", label: "Events", kind: "broker" },
          { id: "bus", label: "Bus", kind: "pubsub" },
        ],
        connections: [
          { from: "web", to: "api", style: "dashed" },
          { from: "api", to: "pg", style: "dotted" },
        ],
      }),
    ).toEqual({
      components: [
        { id: "web", label: "Web", kind: "client" },
        { id: "api", label: "API", kind: "client" },
        { id: "pg", label: "Postgres", kind: "store" },
        { id: "cache", label: "Cache", kind: "store" },
        { id: "files", label: "Files", kind: "storage" },
        { id: "archive", label: "Archive", kind: "storage" },
        { id: "events", label: "Events", kind: "queue" },
        { id: "bus", label: "Bus", kind: "queue" },
      ],
      connections: [
        { from: "web", to: "api", style: "async" },
        { from: "api", to: "pg", style: "data" },
      ],
    });
  });

  it("accepts connections between known components", () => {
    expect(
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "queue", label: "Queue", kind: "queue" },
        ],
        connections: [{ from: "api", to: "queue", style: "async", label: "enqueue job" }],
      }),
    ).toEqual({
      components: [
        { id: "api", label: "API", kind: "service" },
        { id: "queue", label: "Queue", kind: "queue" },
      ],
      connections: [{ from: "api", to: "queue", style: "async", label: "enqueue job" }],
    });
  });

  it("rejects duplicate component ids", () => {
    expect(() =>
      parseDiagramPlan({
        components: [
          { id: "cache", label: "Cache", kind: "store" },
          { id: "cache", label: "Cache 2", kind: "store" },
        ],
      }),
    ).toThrow(/Duplicate component id/);
  });

  it("rejects a missing kind", () => {
    expect(() =>
      parseDiagramPlan({
        components: [{ id: "api", label: "API" }],
      }),
    ).toThrow(/kind/);
  });

  it("rejects an unknown kind after aliases", () => {
    expect(() =>
      parseDiagramPlan({
        components: [{ id: "api", label: "API", kind: "cache" }],
      }),
    ).toThrow(/unknown kind/);
  });

  it("rejects a missing style", () => {
    expect(() =>
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "db", label: "DB", kind: "store" },
        ],
        connections: [{ from: "api", to: "db" }],
      }),
    ).toThrow(/style/);
  });

  it("rejects an unknown style after aliases", () => {
    expect(() =>
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "db", label: "DB", kind: "store" },
        ],
        connections: [{ from: "api", to: "db", style: "solid" }],
      }),
    ).toThrow(/unknown style/);
  });

  it("rejects duplicate from and to pairs", () => {
    expect(() =>
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "db", label: "DB", kind: "store" },
        ],
        connections: [
          { from: "api", to: "db", style: "sync" },
          { from: "api", to: "db", style: "data", label: "read" },
        ],
      }),
    ).toThrow(/Duplicate connection/);
  });

  it("rejects an empty Plan", () => {
    expect(() => parseDiagramPlan({ components: [] })).toThrow(/at least one component/);
  });
});

describe("buildRecordsFromDiagramPlan", () => {
  it("builds valid tldraw geo records with auto layout", () => {
    const result = buildRecordsFromDiagramPlan({
      components: [
        { id: "api", label: "API", kind: "service" },
        { id: "db", label: "Database", kind: "store" },
      ],
      connections: [{ from: "api", to: "db", style: "sync" }],
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
        { id: "api", label: "API", kind: "service" },
        { id: "worker", label: "Worker", kind: "service" },
      ],
      connections: [{ from: "api", to: "worker", style: "async", label: "enqueue" }],
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

  it("colors boxes by kind and dashes arrows by style", () => {
    const result = buildRecordsFromDiagramPlan({
      components: [
        { id: "web", label: "Web", kind: "client" },
        { id: "api", label: "API", kind: "service" },
        { id: "db", label: "Database", kind: "store" },
        { id: "jobs", label: "Jobs", kind: "queue" },
        { id: "files", label: "Files", kind: "storage" },
        { id: "stripe", label: "Stripe", kind: "external" },
      ],
      connections: [
        { from: "web", to: "api", style: "sync" },
        { from: "api", to: "jobs", style: "async" },
        { from: "api", to: "db", style: "data" },
      ],
    });

    expect(result.records["shape:web"]).toMatchObject({
      props: expect.objectContaining({ color: "blue", fill: "solid" }),
    });
    expect(result.records["shape:api"]).toMatchObject({
      props: expect.objectContaining({ color: "violet" }),
    });
    expect(result.records["shape:db"]).toMatchObject({
      props: expect.objectContaining({ color: "green" }),
    });
    expect(result.records["shape:jobs"]).toMatchObject({
      props: expect.objectContaining({ color: "orange" }),
    });
    expect(result.records["shape:files"]).toMatchObject({
      props: expect.objectContaining({ color: "yellow" }),
    });
    expect(result.records["shape:stripe"]).toMatchObject({
      props: expect.objectContaining({ color: "grey" }),
    });
    expect(result.records["shape:arrow-web-to-api"]).toMatchObject({
      props: expect.objectContaining({ dash: "solid", kind: "elbow" }),
    });
    expect(result.records["shape:arrow-api-to-jobs"]).toMatchObject({
      props: expect.objectContaining({ dash: "dashed" }),
    });
    expect(result.records["shape:arrow-api-to-db"]).toMatchObject({
      props: expect.objectContaining({ dash: "dotted" }),
    });
  });

  it("offsets parallel arrow anchors and does not put every label at 0.5", () => {
    const result = buildRecordsFromDiagramPlan({
      components: [
        { id: "api", label: "API", kind: "service" },
        { id: "db", label: "Database", kind: "store" },
        { id: "cache", label: "Cache", kind: "store" },
      ],
      connections: [
        { from: "api", to: "db", style: "data", label: "persist" },
        { from: "api", to: "cache", style: "sync", label: "read" },
      ],
    });

    const dbStart = result.records["binding:api-to-db-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const cacheStart = result.records["binding:api-to-cache-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const dbArrow = result.records["shape:arrow-api-to-db"] as {
      props: { labelPosition: number };
    };
    const cacheArrow = result.records["shape:arrow-api-to-cache"] as {
      props: { labelPosition: number };
    };

    expect(dbStart.props.normalizedAnchor).not.toEqual(cacheStart.props.normalizedAnchor);
    expect(dbArrow.props.labelPosition).not.toBe(cacheArrow.props.labelPosition);
    expect([dbArrow.props.labelPosition, cacheArrow.props.labelPosition]).not.toEqual([
      0.5, 0.5,
    ]);
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
                  components: [{ id: "worker", label: "Worker", kind: "service" }],
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
        components: [{ id: "worker", label: "Worker", kind: "service" }],
        connections: [],
      },
      tokensUsed: 128,
      model: "openai/gpt-oss-20b",
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

  it("throws InvalidInferenceJsonError when Groq content is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "not-json" } }],
        }),
        { status: 200 },
      ),
    );

    await expect(
      generateDiagramPlanWithGroq("Design anything", {
        apiKey: "test-key",
        model: "openai/gpt-oss-20b",
      }),
    ).rejects.toBeInstanceOf(InvalidInferenceJsonError);
  });
});
