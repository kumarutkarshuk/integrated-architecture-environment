export const COMPONENT_KINDS = [
  "client",
  "service",
  "store",
  "queue",
  "storage",
  "external",
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const CONNECTION_STYLES = ["sync", "async", "data"] as const;

export type ConnectionStyle = (typeof CONNECTION_STYLES)[number];

export const CONNECTION_EDGES = ["left", "right", "top", "bottom"] as const;

export type ConnectionEdge = (typeof CONNECTION_EDGES)[number];

export const KIND_COLORS: Record<ComponentKind, string> = {
  client: "blue",
  service: "violet",
  store: "green",
  queue: "orange",
  storage: "yellow",
  external: "grey",
};

export const STYLE_DASH: Record<ConnectionStyle, string> = {
  sync: "solid",
  async: "dashed",
  data: "dotted",
};

const KIND_BY_COLOR = Object.fromEntries(
  Object.entries(KIND_COLORS).map(([kind, color]) => [color, kind]),
) as Record<string, ComponentKind>;

const STYLE_BY_DASH = Object.fromEntries(
  Object.entries(STYLE_DASH).map(([style, dash]) => [dash, style]),
) as Record<string, ConnectionStyle>;

export function kindFromColor(color: string | undefined): ComponentKind | null {
  if (!color) {
    return null;
  }
  return KIND_BY_COLOR[color] ?? null;
}

export function styleFromDash(
  dash: string | undefined,
): ConnectionStyle | null {
  if (!dash) {
    return null;
  }
  return STYLE_BY_DASH[dash] ?? null;
}

export function parseComponentKind(value: string): ComponentKind | null {
  return (COMPONENT_KINDS as readonly string[]).includes(value)
    ? (value as ComponentKind)
    : null;
}

export function parseConnectionStyle(value: string): ConnectionStyle | null {
  return (CONNECTION_STYLES as readonly string[]).includes(value)
    ? (value as ConnectionStyle)
    : null;
}

export function parseConnectionEdge(value: string): ConnectionEdge | null {
  return (CONNECTION_EDGES as readonly string[]).includes(value)
    ? (value as ConnectionEdge)
    : null;
}

export function anchorFromEdge(
  edge: ConnectionEdge,
  along = 0.5,
): { x: number; y: number } {
  if (edge === "left") {
    return { x: 0, y: along };
  }
  if (edge === "right") {
    return { x: 1, y: along };
  }
  if (edge === "top") {
    return { x: along, y: 0 };
  }
  return { x: along, y: 1 };
}

export function alongFromAnchor(
  edge: ConnectionEdge,
  anchor: { x: number; y: number },
): number {
  if (edge === "left" || edge === "right") {
    return anchor.y;
  }
  return anchor.x;
}

export function edgeFromAnchor(
  anchor: { x: number; y: number },
): ConnectionEdge {
  const left = anchor.x;
  const right = 1 - anchor.x;
  const top = anchor.y;
  const bottom = 1 - anchor.y;
  const nearest = Math.min(left, right, top, bottom);
  if (nearest === left) {
    return "left";
  }
  if (nearest === right) {
    return "right";
  }
  if (nearest === top) {
    return "top";
  }
  return "bottom";
}
