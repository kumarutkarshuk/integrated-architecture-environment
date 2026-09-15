import { describe, expect, it } from "vitest";
import { parseDiagramPlan } from "../../src/ai/diagram-plan.js";
import { buildRecordsFromDiagramPlan } from "../../src/ai/diagram-records.js";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function isValidTldrawIndexKey(key: string): boolean {
  if (key.length < 2) {
    return false;
  }

  const head = key[0]!;
  if (head < "a" || head > "z") {
    return false;
  }

  const integerLength = head.charCodeAt(0) - "a".charCodeAt(0) + 2;
  if (key.length < integerLength) {
    return false;
  }

  for (const character of key) {
    if (!BASE62.includes(character)) {
      return false;
    }
  }

  const fraction = key.slice(integerLength);
  return !fraction.endsWith("0");
}

describe("buildRecordsFromDiagramPlan indexes", () => {
  it("emits tldraw index keys that stay valid past 26 shapes", () => {
    const components = Array.from({ length: 20 }, (_, index) => ({
      id: `svc-${index + 1}`,
      label: `Service ${index + 1}`,
      kind: "service",
    }));
    const connections = Array.from({ length: 19 }, (_, index) => ({
      from: `svc-${index + 1}`,
      to: `svc-${index + 2}`,
      style: "sync",
      label: `step ${index + 1}`,
    }));

    const result = buildRecordsFromDiagramPlan(
      parseDiagramPlan({ components, connections }),
    );
    const shapes = Object.values(result.records).filter(
      (record): record is { typeName: string; type: string; index: string } => {
        if (!record || typeof record !== "object") {
          return false;
        }
        const value = record as { typeName?: unknown; index?: unknown };
        return value.typeName === "shape" && typeof value.index === "string";
      },
    );

    expect(shapes.length).toBeGreaterThan(26);
    expect(shapes.map((shape) => shape.index)).not.toContain("ba");
    expect(shapes[0]?.index).toBe("a1");

    for (const shape of shapes) {
      expect(isValidTldrawIndexKey(shape.index), shape.index).toBe(true);
    }
  });
});
