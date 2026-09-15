import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidInferenceJsonError, parseDiagramPlan } from "../../src/ai/diagram-plan.js";
import { buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";
import { generateDiagramPlanWithGroq, classifyPromptSafetyWithGroq, parsePromptSafetyResult } from "../../src/ai/groq-client.js";
import { resetGroqKeyCursor, runWithGroqKeySlot } from "../../src/ai/groq-keys.js";

function mainPlan(
  components: Array<{ id: string; label: string; kind: string }>,
  connections: Array<{ from: string; to: string; style: string; label?: string }> = [],
) {
  return {
    flows: [
      {
        id: "main",
        label: "Main",
        components,
        connections,
      },
    ],
  };
}

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
    ).toEqual(
      mainPlan([
        { id: "api-gateway", label: "API Gateway", kind: "service" },
        { id: "database", label: "PostgreSQL", kind: "store" },
      ]),
    );
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
    ).toEqual(
      mainPlan(
        [
          { id: "web", label: "Web", kind: "client" },
          { id: "api", label: "API", kind: "client" },
          { id: "pg", label: "Postgres", kind: "store" },
          { id: "cache", label: "Cache", kind: "store" },
          { id: "files", label: "Files", kind: "storage" },
          { id: "archive", label: "Archive", kind: "storage" },
          { id: "events", label: "Events", kind: "queue" },
          { id: "bus", label: "Bus", kind: "queue" },
        ],
        [
          { from: "web", to: "api", style: "async" },
          { from: "api", to: "pg", style: "data" },
        ],
      ),
    );
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
    ).toEqual(
      mainPlan(
        [
          { id: "api", label: "API", kind: "service" },
          { id: "queue", label: "Queue", kind: "queue" },
        ],
        [{ from: "api", to: "queue", style: "async", label: "enqueue job" }],
      ),
    );
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

  it("accepts two flows that reuse the same component ids", () => {
    expect(
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            label: "Insert",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
              { id: "store", label: "Store", kind: "store" },
            ],
            connections: [
              { from: "client", to: "api", style: "sync", label: "create" },
              { from: "api", to: "store", style: "data", label: "write" },
            ],
          },
          {
            id: "retrieve",
            label: "Retrieve",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
              { id: "store", label: "Store", kind: "store" },
            ],
            connections: [
              { from: "client", to: "api", style: "sync", label: "lookup" },
              { from: "api", to: "store", style: "data", label: "read" },
            ],
          },
        ],
      }),
    ).toEqual({
      flows: [
        {
          id: "insert",
          label: "Insert",
          components: [
            { id: "client", label: "Client", kind: "client" },
            { id: "api", label: "API", kind: "service" },
            { id: "store", label: "Store", kind: "store" },
          ],
          connections: [
            { from: "client", to: "api", style: "sync", label: "create" },
            { from: "api", to: "store", style: "data", label: "write" },
          ],
        },
        {
          id: "retrieve",
          label: "Retrieve",
          components: [
            { id: "client", label: "Client", kind: "client" },
            { id: "api", label: "API", kind: "service" },
            { id: "store", label: "Store", kind: "store" },
          ],
          connections: [
            { from: "client", to: "api", style: "sync", label: "lookup" },
            { from: "api", to: "store", style: "data", label: "read" },
          ],
        },
      ],
    });
  });

  it("maps group and name aliases to flows", () => {
    expect(
      parseDiagramPlan({
        groups: [
          {
            id: "Write Path",
            name: "Write",
            components: [
              { id: "api", label: "API", kind: "service" },
              { id: "db", label: "DB", kind: "store" },
            ],
            connections: [{ from: "api", to: "db", style: "sync" }],
          },
        ],
      }),
    ).toEqual({
      flows: [
        {
          id: "write-path",
          label: "Write",
          components: [
            { id: "api", label: "API", kind: "service" },
            { id: "db", label: "DB", kind: "store" },
          ],
          connections: [{ from: "api", to: "db", style: "sync" }],
        },
      ],
    });
  });

  it("rejects duplicate flow ids", () => {
    expect(() =>
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            label: "Insert",
            components: [{ id: "api", label: "API", kind: "service" }],
          },
          {
            id: "insert",
            label: "Insert again",
            components: [{ id: "api", label: "API", kind: "service" }],
          },
        ],
      }),
    ).toThrow(/Duplicate flow id/);
  });

  it("rejects more than four flows", () => {
    const flow = {
      id: "path",
      label: "Path",
      components: [{ id: "api", label: "API", kind: "service" }],
    };

    expect(() =>
      parseDiagramPlan({
        flows: [
          { ...flow, id: "one" },
          { ...flow, id: "two" },
          { ...flow, id: "three" },
          { ...flow, id: "four" },
          { ...flow, id: "five" },
        ],
      }),
    ).toThrow(/at most 4 flows/);
  });

  it("rejects a missing flow label", () => {
    expect(() =>
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            components: [{ id: "api", label: "API", kind: "service" }],
          },
        ],
      }),
    ).toThrow(/label/);
  });

  it("rejects duplicate component ids inside one flow", () => {
    expect(() =>
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            label: "Insert",
            components: [
              { id: "api", label: "API", kind: "service" },
              { id: "api", label: "API 2", kind: "service" },
            ],
          },
        ],
      }),
    ).toThrow(/Duplicate component id/);
  });
});

describe("buildRecordsFromDiagramPlan", () => {
  it("builds valid tldraw geo records with auto layout", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "db", label: "Database", kind: "store" },
        ],
        connections: [{ from: "api", to: "db", style: "sync" }],
      }),
    );

    expect(Object.keys(result.records)).toEqual([
      "shape:api",
      "shape:db",
      "shape:arrow-api-to-db",
      "binding:api-to-db-start",
      "binding:api-to-db-end",
    ]);
    const api = result.records["shape:api"] as {
      x: number;
      props: { w: number };
    };
    const db = result.records["shape:db"] as { x: number };

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
    expect(db.x - (api.x + api.props.w)).toBeGreaterThanOrEqual(240);
  });

  it("builds arrow shapes and bindings for connections", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "worker", label: "Worker", kind: "service" },
        ],
        connections: [{ from: "api", to: "worker", style: "async", label: "enqueue" }],
      }),
    );

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
      props: expect.objectContaining({
        terminal: "start",
        isPrecise: true,
        snap: "edge",
      }),
    });
    expect(result.records["binding:api-to-worker-end"]).toMatchObject({
      typeName: "binding",
      type: "arrow",
      toId: "shape:worker",
      props: expect.objectContaining({ terminal: "end" }),
    });
  });

  it("colors boxes by kind and dashes arrows by style", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
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
      }),
    );

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
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "db", label: "Database", kind: "store" },
          { id: "cache", label: "Cache", kind: "store" },
        ],
        connections: [
          { from: "api", to: "db", style: "data", label: "persist" },
          { from: "api", to: "cache", style: "sync", label: "read" },
        ],
      }),
    );

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
    expect([dbArrow.props.labelPosition, cacheArrow.props.labelPosition]).not.toEqual([
      0.5, 0.5,
    ]);
  });

  it("keeps a lone arrow label off the midpoint so a crossing elbow does not hide it", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "api", label: "API", kind: "service" },
          { id: "cache", label: "Cache", kind: "store" },
          { id: "store", label: "Store", kind: "store" },
        ],
        connections: [
          { from: "api", to: "cache", style: "sync", label: "lookup" },
          { from: "cache", to: "store", style: "data", label: "fetch mapping" },
        ],
      }),
    );

    const lookup = result.records["shape:arrow-api-to-cache"] as {
      props: { labelPosition: number };
    };
    const fetchMapping = result.records["shape:arrow-cache-to-store"] as {
      props: { labelPosition: number };
    };

    expect(lookup.props.labelPosition).not.toBe(fetchMapping.props.labelPosition);
  });

  it("puts opposite arrows on separate WebMCP lanes so query and response labels do not mash", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "api", label: "Query API", kind: "service" },
          { id: "client", label: "Client", kind: "client" },
        ],
        connections: [
          { from: "client", to: "api", style: "sync", label: "query" },
          { from: "api", to: "client", style: "sync", label: "response" },
        ],
      }),
    );

    const queryStart = result.records["binding:client-to-api-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const queryEnd = result.records["binding:client-to-api-end"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const responseStart = result.records["binding:api-to-client-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const responseEnd = result.records["binding:api-to-client-end"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const queryArrow = result.records["shape:arrow-client-to-api"] as {
      props: { labelPosition: number };
    };
    const responseArrow = result.records["shape:arrow-api-to-client"] as {
      props: { labelPosition: number };
    };

    expect(queryStart.props.normalizedAnchor).toEqual({ x: 1, y: 0.5 });
    expect(queryEnd.props.normalizedAnchor).toEqual({ x: 0, y: 0.5 });
    expect(responseStart.props.normalizedAnchor).toEqual({ x: 0, y: 0.34 });
    expect(responseEnd.props.normalizedAnchor).toEqual({ x: 1, y: 0.34 });
    expect(queryArrow.props.labelPosition).not.toBe(responseArrow.props.labelPosition);
  });

  it("routes a skip-layer arrow around the box in between the way WebMCP does", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "client", label: "Client", kind: "client" },
          { id: "api", label: "API", kind: "service" },
          { id: "store", label: "Store", kind: "store" },
        ],
        connections: [
          { from: "client", to: "api", style: "sync", label: "hit" },
          { from: "api", to: "store", style: "data", label: "fetch" },
          { from: "client", to: "store", style: "data", label: "embed query" },
        ],
      }),
    );

    const hopStart = result.records["binding:client-to-api-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const skipStart = result.records["binding:client-to-store-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const skipEnd = result.records["binding:client-to-store-end"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };

    expect(hopStart.props.normalizedAnchor).toEqual({ x: 1, y: 0.5 });
    expect(skipStart.props.normalizedAnchor.y).toBe(0);
    expect(skipEnd.props.normalizedAnchor.y).toBe(0);
  });

  it("draws titled clusters and keeps the same component id in two flows", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            label: "Insert",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
              { id: "store", label: "Store", kind: "store" },
            ],
            connections: [
              { from: "client", to: "api", style: "sync", label: "create" },
              { from: "api", to: "store", style: "data", label: "write" },
            ],
          },
          {
            id: "retrieve",
            label: "Retrieve",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
              { id: "store", label: "Store", kind: "store" },
            ],
            connections: [
              { from: "client", to: "api", style: "sync", label: "lookup" },
              { from: "api", to: "store", style: "data", label: "read" },
            ],
          },
        ],
      }),
    );

    const insertTitle = result.records["shape:flow-insert-title"] as {
      y: number;
      props: { fill: string; align: string };
    };
    const retrieveTitle = result.records["shape:flow-retrieve-title"] as {
      y: number;
    };
    const insertApi = result.records["shape:insert-api"] as {
      y: number;
      props: { h: number };
    };
    const retrieveApi = result.records["shape:retrieve-api"] as { y: number };

    expect(insertTitle.props).toMatchObject({ fill: "none", align: "start" });
    expect(retrieveTitle.y).toBeGreaterThan(insertApi.y + insertApi.props.h);
    expect(retrieveApi.y).toBeGreaterThan(insertApi.y + insertApi.props.h);
    expect(result.records["shape:arrow-insert-client-to-insert-api"]).toBeDefined();
    expect(result.records["shape:arrow-retrieve-client-to-retrieve-api"]).toBeDefined();
    expect(result.records["shape:api"]).toBeUndefined();
  });
});

describe("generateDiagramPlanWithGroq", () => {
  beforeEach(() => {
    resetGroqKeyCursor();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetGroqKeyCursor();
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
      plan: mainPlan([{ id: "worker", label: "Worker", kind: "service" }]),
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

  it("retries the next Groq key when the current key is rate limited", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), {
          status: 429,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    components: [{ id: "api", label: "API", kind: "service" }],
                    connections: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await generateDiagramPlanWithGroq("Design an API", {
      apiKeys: ["key-one", "key-two"],
      model: "openai/gpt-oss-20b",
    });

    expect(result.plan.flows[0]?.components[0]?.id).toBe("api");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer key-one" }),
      }),
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer key-two" }),
      }),
    );
  });

  it("uses the same Groq key for every call in one job, then the next key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const ok = (id: string) =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  components: [{ id, label: id, kind: "service" }],
                  connections: [],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );

    fetchMock
      .mockResolvedValueOnce(ok("first"))
      .mockResolvedValueOnce(ok("second"))
      .mockResolvedValueOnce(ok("third"));

    const keys = ["key-one", "key-two", "key-three"];
    const config = { apiKeys: keys, model: "openai/gpt-oss-20b" };

    await runWithGroqKeySlot(keys, async () => {
      await generateDiagramPlanWithGroq("one", config);
      await generateDiagramPlanWithGroq("two", config);
    });
    await generateDiagramPlanWithGroq("three", config);

    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer key-one" }),
      }),
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer key-one" }),
      }),
    );
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer key-two" }),
      }),
    );
  });
});

describe("classifyPromptSafetyWithGroq", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetGroqKeyCursor();
  });

  it("returns safe true or false from the classifier model", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ safe: false }) } }],
          usage: { total_tokens: 12 },
        }),
        { status: 200 },
      ),
    );

    const result = await classifyPromptSafetyWithGroq("build a weapon", {
      apiKey: "test-key",
      model: "openai/gpt-oss-20b",
    });

    expect(result).toEqual({
      safe: false,
      tokensUsed: 12,
      model: "openai/gpt-oss-20b",
    });
    expect(parsePromptSafetyResult({ safe: true })).toBe(true);
    expect(parsePromptSafetyResult({ bad: true })).toBe(false);
  });
});
