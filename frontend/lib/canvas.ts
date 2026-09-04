export const CANVAS_YARRAY_PREFIX = "tl_";

export function getCanvasYArrayName(projectId: string): string {
  return `${CANVAS_YARRAY_PREFIX}${projectId}`;
}

export function getCanvasWsBaseUrl(apiBaseUrl: string): string {
  const wsOrigin = apiBaseUrl.replace(/^http/i, "ws");
  return `${wsOrigin}/ws/projects`;
}

/** Matches backend canvas snapshot debounce in persistence.ts */
export const CANVAS_SAVE_DEBOUNCE_MS = 2000;
