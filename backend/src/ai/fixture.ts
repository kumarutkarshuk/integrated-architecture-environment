import { buildGeoShape } from "./diagram-records.js";
import type { ExportSpecResult, GenerateResult } from "./types.js";

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
    plan: {
      components: [{ id: "preview-box", label, kind: "service" }],
      connections: [],
    },
  };
}

export function buildFixtureExportSpecResult(canvasSummary: string): ExportSpecResult {
  const trimmed = canvasSummary.trim();

  if (!trimmed) {
    return {
      markdown: "# Spec\n\nThe canvas is empty.",
      gaps_summary: "The canvas has no shapes, so nothing can be confirmed from the diagram.",
    };
  }

  return {
    markdown: `# Spec\n\n${trimmed}`,
    gaps_summary: "Fixture export noted no extra gaps.",
  };
}
