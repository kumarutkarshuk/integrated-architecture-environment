export const CANVAS_PAGE_ID = "page:page";
const LEGACY_PAGE_ID = "page:preview";

export function normalizeCanvasRecords(
  records: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(records)) {
    if (key === LEGACY_PAGE_ID) {
      continue;
    }

    const record = value as Record<string, unknown>;

    if (record.typeName === "page" && key !== CANVAS_PAGE_ID) {
      continue;
    }

    if (record.typeName === "shape") {
      const parentId = record.parentId;
      if (
        parentId === LEGACY_PAGE_ID ||
        (typeof parentId === "string" &&
          parentId.startsWith("page:") &&
          parentId !== CANVAS_PAGE_ID)
      ) {
        normalized[key] = { ...record, parentId: CANVAS_PAGE_ID };
        continue;
      }
    }

    normalized[key] = value;
  }

  return normalized;
}
