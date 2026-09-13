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
