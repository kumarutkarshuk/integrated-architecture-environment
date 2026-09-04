import { buildGeoShape } from "./diagram-records.js";
import type { GenerateResult } from "./types.js";

export const PREVIEW_SHAPE_ID = "shape:preview-box";

export function buildFixtureGenerateResult(prompt: string): GenerateResult {
  const slug = prompt.slice(0, 24).replace(/\s+/g, "-").toLowerCase();
  const label = prompt.slice(0, 80) || "Generated preview";

  return {
    records: {
      [PREVIEW_SHAPE_ID]: buildGeoShape({
        id: PREVIEW_SHAPE_ID,
        label,
        x: 100,
        y: 100,
        w: 240,
        h: 120,
        index: "a1",
        meta: { generatedFrom: slug },
      }),
    },
  };
}
