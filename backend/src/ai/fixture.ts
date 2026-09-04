import type { GenerateResult } from "./types.js";

export const PREVIEW_PAGE_ID = "page:preview";
export const PREVIEW_SHAPE_ID = "shape:preview-box";

function toRichText(text: string) {
  return {
    type: "doc",
    content: text.split("\n").map((line) =>
      line
        ? {
            type: "paragraph",
            content: [{ type: "text", text: line }],
          }
        : { type: "paragraph" },
    ),
  };
}

export function buildFixtureGenerateResult(prompt: string): GenerateResult {
  const slug = prompt.slice(0, 24).replace(/\s+/g, "-").toLowerCase();
  const label = prompt.slice(0, 80) || "Generated preview";

  return {
    records: {
      [PREVIEW_PAGE_ID]: {
        id: PREVIEW_PAGE_ID,
        typeName: "page",
        name: "Preview",
        index: "a1",
        meta: {},
      },
      [PREVIEW_SHAPE_ID]: {
        id: PREVIEW_SHAPE_ID,
        typeName: "shape",
        type: "geo",
        x: 100,
        y: 100,
        rotation: 0,
        index: "a1",
        parentId: PREVIEW_PAGE_ID,
        isLocked: false,
        opacity: 1,
        props: {
          geo: "rectangle",
          dash: "solid",
          url: "",
          w: 240,
          h: 120,
          growY: 0,
          scale: 1,
          flipX: false,
          flipY: false,
          labelColor: "black",
          color: "black",
          fill: "solid",
          size: "m",
          font: "draw",
          align: "middle",
          verticalAlign: "middle",
          richText: toRichText(label),
        },
        meta: { generatedFrom: slug },
      },
    },
  };
}
