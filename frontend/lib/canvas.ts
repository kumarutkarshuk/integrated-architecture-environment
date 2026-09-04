export const CANVAS_YARRAY_PREFIX = "tl_";
export const CANVAS_PAGE_ID = "page:page" as const;

export const TLDRAW_OPTIONS = {
  maxPages: 1,
} as const;

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

export function getCanvasYArrayName(projectId: string): string {
  return `${CANVAS_YARRAY_PREFIX}${projectId}`;
}

export function getCanvasWsBaseUrl(apiBaseUrl: string): string {
  const wsOrigin = apiBaseUrl.replace(/^http/i, "ws");
  return `${wsOrigin}/ws/projects`;
}

/** Matches backend canvas snapshot debounce in persistence.ts */
export const CANVAS_SAVE_DEBOUNCE_MS = 2000;

export function frameCanvasContent(editor: {
  getCurrentPageBounds(): { x: number; y: number; w: number; h: number } | undefined;
  zoomToBounds(
    bounds: { x: number; y: number; w: number; h: number },
    opts?: { animation?: { duration: number }; inset?: number; targetZoom?: number },
  ): void;
}): void {
  const bounds = editor.getCurrentPageBounds();
  if (!bounds || bounds.w === 0 || bounds.h === 0) {
    return;
  }

  editor.zoomToBounds(bounds, {
    animation: { duration: 0 },
    inset: 72,
    targetZoom: 1,
  });
}
