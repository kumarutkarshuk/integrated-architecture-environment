import { describe, expect, it } from "vitest";
import { normalizeCanvasRecords } from "../../src/canvas/records.js";

describe("normalizeCanvasRecords", () => {
  it("repairs invalid tldraw shape indexes like ba", () => {
    const records = normalizeCanvasRecords({
      "shape:box": {
        id: "shape:box",
        typeName: "shape",
        type: "geo",
        index: "a1",
        parentId: "page:page",
      },
      "shape:arrow": {
        id: "shape:arrow",
        typeName: "shape",
        type: "arrow",
        index: "ba",
        parentId: "page:page",
      },
    });

    expect(records["shape:box"]).toMatchObject({ index: "a1" });
    expect(records["shape:arrow"]).toMatchObject({ index: "a2" });
  });
});
