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

export class InvalidDiagramPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDiagramPlanError";
  }
}

export class InvalidInferenceJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInferenceJsonError";
  }
}

export interface DiagramComponent {
  id: string;
  label: string;
  kind: ComponentKind;
}

export interface DiagramConnection {
  from: string;
  to: string;
  style: ConnectionStyle;
  label?: string;
}

export interface DiagramPlan {
  components: DiagramComponent[];
  connections: DiagramConnection[];
}

const KIND_ALIASES: Record<string, ComponentKind> = {
  client: "client",
  ui: "client",
  frontend: "client",
  service: "service",
  store: "store",
  database: "store",
  db: "store",
  queue: "queue",
  broker: "queue",
  pubsub: "queue",
  storage: "storage",
  s3: "storage",
  blob: "storage",
  external: "external",
};

const STYLE_ALIASES: Record<string, ConnectionStyle> = {
  sync: "sync",
  async: "async",
  dashed: "async",
  data: "data",
  dotted: "data",
};

export function parseDiagramPlan(raw: unknown): DiagramPlan {
  if (!raw || typeof raw !== "object") {
    throw new InvalidDiagramPlanError("Diagram plan must be an object");
  }

  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.components)) {
    throw new InvalidDiagramPlanError("Diagram plan must include a components array");
  }

  const components = value.components.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidDiagramPlanError(`Component at index ${index} must be an object`);
    }

    const component = entry as Record<string, unknown>;
    const id = readString(component.id, `components[${index}].id`);
    const label = readString(component.label, `components[${index}].label`);
    const kind = canonicalizeKind(component.kind, `components[${index}].kind`);

    return {
      id: slugifyComponentId(id),
      label: label.trim(),
      kind,
    };
  });

  if (components.length === 0) {
    throw new InvalidDiagramPlanError("Diagram plan must include at least one component");
  }

  const componentIds = new Set<string>();
  for (const component of components) {
    if (componentIds.has(component.id)) {
      throw new InvalidDiagramPlanError(`Duplicate component id: ${component.id}`);
    }
    componentIds.add(component.id);
  }

  const connections = parseConnections(value.connections, components, componentIds);

  return { components, connections };
}

function parseConnections(
  raw: unknown,
  components: DiagramComponent[],
  componentIds: Set<string>,
): DiagramConnection[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new InvalidDiagramPlanError("Diagram plan connections must be an array");
  }

  const seenPairs = new Set<string>();

  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidDiagramPlanError(`Connection at index ${index} must be an object`);
    }

    const connection = entry as Record<string, unknown>;
    const from = resolveConnectionComponentId(
      readString(connection.from, `connections[${index}].from`),
      components,
      componentIds,
    );
    const to = resolveConnectionComponentId(
      readString(connection.to, `connections[${index}].to`),
      components,
      componentIds,
    );

    if (from === to) {
      throw new InvalidDiagramPlanError(
        `Connection cannot point from a component to itself: ${from}`,
      );
    }

    const pairKey = `${from}->${to}`;
    if (seenPairs.has(pairKey)) {
      throw new InvalidDiagramPlanError(`Duplicate connection from ${from} to ${to}`);
    }
    seenPairs.add(pairKey);

    const style = canonicalizeStyle(connection.style, `connections[${index}].style`);

    const label =
      connection.label === undefined || connection.label === null
        ? undefined
        : readString(connection.label, `connections[${index}].label`).trim();

    return { from, to, style, label };
  });
}

function canonicalizeKind(value: unknown, field: string): ComponentKind {
  const raw = readString(value, field).trim().toLowerCase();
  const kind = KIND_ALIASES[raw];
  if (!kind) {
    throw new InvalidDiagramPlanError(`${field} has unknown kind: ${raw}`);
  }
  return kind;
}

function canonicalizeStyle(value: unknown, field: string): ConnectionStyle {
  const raw = readString(value, field).trim().toLowerCase();
  const style = STYLE_ALIASES[raw];
  if (!style) {
    throw new InvalidDiagramPlanError(`${field} has unknown style: ${raw}`);
  }
  return style;
}

function resolveConnectionComponentId(
  rawRef: string,
  components: DiagramComponent[],
  componentIds: Set<string>,
): string {
  const slug = slugifyComponentId(rawRef);
  if (componentIds.has(slug)) {
    return slug;
  }

  const normalizedRef = rawRef.trim().toLowerCase();
  const byLabel = components.find((component) => {
    return (
      component.label.trim().toLowerCase() === normalizedRef ||
      slugifyComponentId(component.label) === slug
    );
  });

  if (byLabel) {
    return byLabel.id;
  }

  throw new InvalidDiagramPlanError(`Connection references unknown component: ${slug}`);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidDiagramPlanError(`${field} must be a non-empty string`);
  }
  return value;
}

export function slugifyComponentId(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (!slug) {
    throw new InvalidDiagramPlanError("Component id must contain letters or numbers");
  }

  return slug;
}
