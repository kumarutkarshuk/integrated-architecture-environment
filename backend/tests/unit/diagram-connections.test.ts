import { describe, expect, it } from "vitest";
import { placeDiagramConnections } from "../../src/ai/diagram-connections.js";
import { layoutDiagramComponents } from "../../src/ai/diagram-layout.js";
import { parseDiagramPlan } from "../../src/ai/diagram-plan.js";
import { buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";

function edgeOf(anchor: { x: number; y: number }): "left" | "right" | "top" | "bottom" {
  if (anchor.x === 0) {
    return "left";
  }
  if (anchor.x === 1) {
    return "right";
  }
  if (anchor.y === 0) {
    return "top";
  }
  return "bottom";
}

describe("placeDiagramConnections", () => {
  it("does not reuse a busy side for a second outgoing arrow in a RAG-style graph", () => {
    const plan = parseDiagramPlan({
      components: [
        { id: "retriever", label: "Retriever", kind: "service" },
        { id: "llm", label: "LLM", kind: "external" },
        { id: "vector-store", label: "Vector Store", kind: "store" },
      ],
      connections: [
        { from: "retriever", to: "llm", style: "sync", label: "generate" },
        {
          from: "retriever",
          to: "vector-store",
          style: "data",
          label: "get vectors",
        },
        { from: "vector-store", to: "retriever", style: "data", label: "chunks" },
      ],
    });
    const flow = plan.flows[0]!;
    const boxes = layoutDiagramComponents(flow.components, flow.connections);
    const placed = placeDiagramConnections(boxes, flow.connections);

    const generate = placed.find(
      (item) => item.from === "retriever" && item.to === "llm",
    );
    const getVectors = placed.find(
      (item) => item.from === "retriever" && item.to === "vector-store",
    );

    expect(generate?.fromEdge).toBe("right");
    expect(getVectors?.fromEdge).toBe("bottom");
    expect(getVectors?.fromEdge).not.toBe(generate?.fromEdge);
  });

  it("does not send fetch-vectors through the generate gap when that arrow is listed first", () => {
    const plan = parseDiagramPlan({
      components: [
        { id: "client", label: "Client", kind: "client" },
        { id: "query-api", label: "Query API", kind: "service" },
        { id: "retriever", label: "Retriever", kind: "service" },
        { id: "vector-store", label: "Vector Store", kind: "store" },
        { id: "llm", label: "LLM", kind: "external" },
        { id: "formatter", label: "Formatter", kind: "service" },
      ],
      connections: [
        { from: "client", to: "query-api", style: "sync", label: "ask" },
        { from: "query-api", to: "retriever", style: "async", label: "search" },
        {
          from: "retriever",
          to: "vector-store",
          style: "data",
          label: "fetch vectors",
        },
        { from: "vector-store", to: "retriever", style: "data", label: "vectors" },
        { from: "retriever", to: "llm", style: "async", label: "generate" },
        { from: "llm", to: "formatter", style: "data", label: "raw answer" },
        { from: "formatter", to: "query-api", style: "sync", label: "format" },
        { from: "query-api", to: "client", style: "sync", label: "answer" },
      ],
    });
    const flow = plan.flows[0]!;
    const boxes = layoutDiagramComponents(flow.components, flow.connections);
    const placed = placeDiagramConnections(boxes, flow.connections);

    const fetchVectors = placed.find(
      (item) => item.from === "retriever" && item.to === "vector-store",
    );
    const generate = placed.find(
      (item) => item.from === "retriever" && item.to === "llm",
    );

    expect(fetchVectors?.fromEdge).toBe("bottom");
    expect(generate?.fromEdge).toBe("right");
    expect(fetchVectors?.fromEdge).not.toBe(generate?.fromEdge);
  });
});

describe("complex generate layout", () => {
  it("keeps same-column boxes a full row apart so labels do not sit on each other", () => {
    const layout = layoutDiagramComponents(
      [
        { id: "llm", label: "LLM", kind: "external" },
        { id: "store-a", label: "Vector Store", kind: "store" },
        { id: "store-b", label: "Vector Store Replica", kind: "store" },
        { id: "retriever", label: "Retriever", kind: "service" },
      ],
      [
        { from: "retriever", to: "llm", style: "sync", label: "generate" },
        { from: "retriever", to: "store-a", style: "data", label: "get vectors" },
        { from: "retriever", to: "store-b", style: "data", label: "get vectors" },
      ],
    );

    const stacked = [...layout.values()]
      .filter((box) => Math.abs(box.x - layout.get("llm")!.x) < 1)
      .sort((a, b) => a.y - b.y);

    expect(stacked.length).toBeGreaterThan(1);
    for (let index = 1; index < stacked.length; index += 1) {
      const above = stacked[index - 1]!;
      const below = stacked[index]!;
      expect(below.y - (above.y + above.h)).toBeGreaterThanOrEqual(160);
    }
  });

  it("sends a lower-row fetch out the bottom so it does not sit on generate", () => {
    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({
        components: [
          { id: "retriever", label: "Retriever", kind: "service" },
          { id: "llm", label: "LLM", kind: "external" },
          { id: "vector-store", label: "Vector Store", kind: "store" },
        ],
        connections: [
          { from: "retriever", to: "llm", style: "sync", label: "generate" },
          {
            from: "retriever",
            to: "vector-store",
            style: "data",
            label: "get vectors",
          },
        ],
      }),
    );

    const generateStart = result.records["binding:retriever-to-llm-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };
    const fetchStart = result.records["binding:retriever-to-vector-store-start"] as {
      props: { normalizedAnchor: { x: number; y: number } };
    };

    expect(edgeOf(generateStart.props.normalizedAnchor)).toBe("right");
    expect(edgeOf(fetchStart.props.normalizedAnchor)).toBe("bottom");
  });
});
