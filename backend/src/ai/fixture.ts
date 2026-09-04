import type { GenerateResult } from "./types.js";

export function buildFixtureGenerateResult(prompt: string): GenerateResult {
  const slug = prompt.slice(0, 24).replace(/\s+/g, "-").toLowerCase();

  return {
    records: {
      "shape:preview-box": {
        id: "shape:preview-box",
        typeName: "shape",
        type: "geo",
        x: 100,
        y: 100,
        props: {
          w: 240,
          h: 120,
          text: prompt.slice(0, 80),
        },
        meta: { generatedFrom: slug },
      },
    },
  };
}
