import { describe, expect, it } from "vitest";
import { layoutDiagramComponents, layoutDiagramPlan } from "../../src/ai/diagram-layout.js";
import { parseDiagramPlan } from "../../src/ai/diagram-plan.js";

describe("layoutDiagramComponents", () => {
  it("spaces connected components horizontally with room for arrows", () => {
    const layout = layoutDiagramComponents(
      [
        { id: "web-client", label: "Web Client", kind: "client" },
        { id: "api-gateway", label: "API Gateway", kind: "service" },
        { id: "payment-service", label: "Payment Service", kind: "service" },
      ],
      [
        { from: "web-client", to: "api-gateway", style: "sync" },
        { from: "api-gateway", to: "payment-service", style: "sync" },
      ],
    );

    const web = layout.get("web-client")!;
    const api = layout.get("api-gateway")!;
    const payment = layout.get("payment-service")!;

    expect(api.x - (web.x + web.w)).toBeGreaterThanOrEqual(240);
    expect(payment.x - (api.x + api.w)).toBeGreaterThanOrEqual(240);
  });

  it("terminates instead of looping forever when connections form a cycle", () => {
    // Regression test: a cycle (A -> B -> C -> A) used to spin the layer
    // relaxation loop forever, freezing the whole Node process because it
    // never yields to the event loop.
    const layout = layoutDiagramComponents(
      [
        { id: "service-a", label: "Service A", kind: "service" },
        { id: "service-b", label: "Service B", kind: "service" },
        { id: "service-c", label: "Service C", kind: "service" },
      ],
      [
        { from: "service-a", to: "service-b", style: "sync" },
        { from: "service-b", to: "service-c", style: "sync" },
        { from: "service-c", to: "service-a", style: "sync" },
      ],
    );

    expect(layout.size).toBe(3);
    for (const box of layout.values()) {
      expect(Number.isFinite(box.x)).toBe(true);
      expect(Number.isFinite(box.y)).toBe(true);
    }
  });

  it("keeps boxes from overlapping and still reads left to right", () => {
    const layout = layoutDiagramComponents(
      [
        { id: "web", label: "Web", kind: "client" },
        { id: "api", label: "API", kind: "service" },
        { id: "db", label: "Database", kind: "store" },
        { id: "worker", label: "Worker", kind: "service" },
      ],
      [
        { from: "web", to: "api", style: "sync" },
        { from: "api", to: "db", style: "data" },
        { from: "api", to: "worker", style: "async" },
      ],
    );

    const boxes = [...layout.values()];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap =
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }

    expect(layout.get("api")!.x).toBeGreaterThan(layout.get("web")!.x);
    expect(layout.get("db")!.x).toBeGreaterThan(layout.get("api")!.x);
  });

  it("stacks two flows as separate titled clusters", () => {
    const layouts = layoutDiagramPlan(
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            label: "Insert",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
            ],
            connections: [{ from: "client", to: "api", style: "sync" }],
          },
          {
            id: "retrieve",
            label: "Retrieve",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
            ],
            connections: [{ from: "client", to: "api", style: "sync" }],
          },
        ],
      }),
    );

    expect(layouts).toHaveLength(2);
    expect(layouts[0]!.title?.label).toBe("Insert");
    expect(layouts[1]!.title?.label).toBe("Retrieve");

    const insertApi = layouts[0]!.boxes.get("api")!;
    const retrieveClient = layouts[1]!.boxes.get("client")!;
    const retrieveTitle = layouts[1]!.title!;

    expect(retrieveTitle.y).toBeGreaterThan(insertApi.y + insertApi.h);
    expect(retrieveClient.y).toBeGreaterThan(retrieveTitle.y + retrieveTitle.h);
    expect(insertApi.x).toBeGreaterThan(layouts[0]!.boxes.get("client")!.x);
  });

  it("keeps flow titles off the boxes below them the way WebMCP placement does", () => {
    const layouts = layoutDiagramPlan(
      parseDiagramPlan({
        flows: [
          {
            id: "insert",
            label: "Insert a very long flow title for spacing",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
            ],
            connections: [{ from: "client", to: "api", style: "sync" }],
          },
          {
            id: "retrieve",
            label: "Retrieve",
            components: [
              { id: "client", label: "Client", kind: "client" },
              { id: "api", label: "API", kind: "service" },
            ],
            connections: [{ from: "client", to: "api", style: "sync" }],
          },
        ],
      }),
    );

    for (const layout of layouts) {
      const title = layout.title!;
      for (const box of layout.boxes.values()) {
        const overlap =
          title.x < box.x + box.w &&
          title.x + title.w > box.x &&
          title.y < box.y + box.h &&
          title.y + title.h > box.y;
        expect(overlap).toBe(false);
        expect(box.y).toBeGreaterThanOrEqual(title.y + title.h + 40);
      }
    }
  });

  it("widens same-row boxes so a long arrow label has room", () => {
    const layout = layoutDiagramComponents(
      [
        { id: "api", label: "API", kind: "service" },
        { id: "worker", label: "Worker", kind: "service" },
      ],
      [
        {
          from: "api",
          to: "worker",
          style: "async",
          label: "enqueue very long background job payload",
        },
      ],
    );

    const api = layout.get("api")!;
    const worker = layout.get("worker")!;
    expect(worker.x - (api.x + api.w)).toBeGreaterThanOrEqual(400);
  });
});
