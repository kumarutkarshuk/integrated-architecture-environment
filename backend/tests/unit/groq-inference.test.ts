import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidInferenceJsonError, parseDiagramPlan } from "../../src/ai/diagram-plan.js";
import { buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";
import { generateDiagramPlanWithGroq } from "../../src/ai/groq-client.js";
import { resetGroqKeyCursor } from "../../src/ai/groq-keys.js";

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
    expect(dbArrow.props.labelPosition).not.toBe(cacheArrow.props.labelPosition);
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

    expect(lookup.props.labelPosition).toBeLessThan(0.4);
    expect(lookup.props.labelPosition).not.toBe(0.5);
    expect(fetchMapping.props.labelPosition).not.toBe(0.5);
  });

  it("puts opposite arrows on separate lanes so query and response labels do not mash", () => {
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
    const responseStart = result.records["binding:api-to-client-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };

    expect(queryStart.props.normalizedAnchor.y).not.toBe(responseStart.props.normalizedAnchor.y);
    expect(
      Math.abs(queryStart.props.normalizedAnchor.y - responseStart.props.normalizedAnchor.y),
    ).toBeGreaterThan(0.2);
  });

  it("drops a diagonal fetch from the bottom so it does not sit on the generate arrow", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "retriever", label: "Retriever", kind: "service" },
          { id: "llm", label: "LLM Service", kind: "external" },
          { id: "vector-db", label: "Vector DB", kind: "store" },
        ],
        connections: [
          { from: "retriever", to: "llm", style: "sync", label: "generate" },
          { from: "retriever", to: "vector-db", style: "data", label: "fetch" },
        ],
      }),
    );

    const generateStart = result.records["binding:retriever-to-llm-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const fetchStart = result.records["binding:retriever-to-vector-db-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const generateArrow = result.records["shape:arrow-retriever-to-llm"] as {
      props: { labelPosition: number };
    };
    const fetchArrow = result.records["shape:arrow-retriever-to-vector-db"] as {
      props: { labelPosition: number };
    };

    const fetchEnd = result.records["binding:retriever-to-vector-db-end"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };

    expect(generateStart.props.normalizedAnchor.x).toBe(1);
    expect(fetchStart.props.normalizedAnchor.y).toBe(1);
    expect(fetchEnd.props.normalizedAnchor.x).toBe(0);
    expect(fetchStart.props.normalizedAnchor).not.toEqual(generateStart.props.normalizedAnchor);
    expect(fetchArrow.props.labelPosition).not.toBe(generateArrow.props.labelPosition);
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
});
