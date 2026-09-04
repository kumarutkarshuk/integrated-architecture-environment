import { describe, expect, it } from "vitest";
import { layoutDiagramComponents } from "../../src/ai/diagram-layout.js";

describe("layoutDiagramComponents", () => {
  it("spaces connected components horizontally with room for arrows", () => {
    const layout = layoutDiagramComponents(
      [
        { id: "web-client", label: "Web Client" },
        { id: "api-gateway", label: "API Gateway" },
        { id: "payment-service", label: "Payment Service" },
      ],
      [
        { from: "web-client", to: "api-gateway" },
        { from: "api-gateway", to: "payment-service" },
      ],
    );

    const web = layout.get("web-client")!;
    const api = layout.get("api-gateway")!;
    const payment = layout.get("payment-service")!;

    expect(api.x - (web.x + web.w)).toBeGreaterThanOrEqual(180);
    expect(payment.x - (api.x + api.w)).toBeGreaterThanOrEqual(180);
  });

  it("terminates instead of looping forever when connections form a cycle", () => {
    // Regression test: a cycle (A -> B -> C -> A) used to spin the layer
    // relaxation loop forever, freezing the whole Node process because it
    // never yields to the event loop.
    const layout = layoutDiagramComponents(
      [
        { id: "service-a", label: "Service A" },
        { id: "service-b", label: "Service B" },
        { id: "service-c", label: "Service C" },
      ],
      [
        { from: "service-a", to: "service-b" },
        { from: "service-b", to: "service-c" },
        { from: "service-c", to: "service-a" },
      ],
    );

    expect(layout.size).toBe(3);
    for (const box of layout.values()) {
      expect(Number.isFinite(box.x)).toBe(true);
      expect(Number.isFinite(box.y)).toBe(true);
    }
  });
});
