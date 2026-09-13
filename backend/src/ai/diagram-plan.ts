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

export const IMPLICIT_FLOW_ID = "main";
export const IMPLICIT_FLOW_LABEL = "Main";
export const MAX_DIAGRAM_FLOWS = 4;

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

export interface DiagramFlow {
  id: string;
  label: string;
  components: DiagramComponent[];
  connections: DiagramConnection[];
}

export interface DiagramPlan {
  flows: DiagramFlow[];
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
  const rawFlows = value.flows ?? value.groups;

  if (rawFlows !== undefined) {
    return { flows: parseFlows(rawFlows) };
  }

  const components = parseComponents(value.components, "components");
  const connections = parseConnections(value.connections, components, "connections");

  return {
    flows: [
      {
        id: IMPLICIT_FLOW_ID,
        label: IMPLICIT_FLOW_LABEL,
        components,
        connections,
      },
    ],
  };
}

function parseFlows(raw: unknown): DiagramFlow[] {
  if (!Array.isArray(raw)) {
    throw new InvalidDiagramPlanError("Diagram plan flows must be an array");
  }

  if (raw.length === 0) {
    throw new InvalidDiagramPlanError("Diagram plan must include at least one flow");
  }

  if (raw.length > MAX_DIAGRAM_FLOWS) {
    throw new InvalidDiagramPlanError(
      `Diagram plan can include at most ${MAX_DIAGRAM_FLOWS} flows`,
    );
  }

  const flows = raw.map((entry, index) => parseFlow(entry, index));
  const seenIds = new Set<string>();

  for (const flow of flows) {
    if (seenIds.has(flow.id)) {
      throw new InvalidDiagramPlanError(`Duplicate flow id: ${flow.id}`);
    }
    seenIds.add(flow.id);
  }

  return flows;
}

function parseFlow(entry: unknown, index: number): DiagramFlow {
  if (!entry || typeof entry !== "object") {
    throw new InvalidDiagramPlanError(`Flow at index ${index} must be an object`);
  }

  const flow = entry as Record<string, unknown>;
  const path = `flows[${index}]`;
  const id = slugifyComponentId(readString(flow.id, `${path}.id`));
  const label = readString(
    flow.label ?? flow.name ?? flow.title,
    `${path}.label`,
  ).trim();
  const components = parseComponents(flow.components, `${path}.components`);
  const connections = parseConnections(
    flow.connections,
    components,
    `${path}.connections`,
  );

  return { id, label, components, connections };
}

function parseComponents(raw: unknown, path: string): DiagramComponent[] {
  if (!Array.isArray(raw)) {
    throw new InvalidDiagramPlanError(
      path === "components"
        ? "Diagram plan must include a components array"
        : `${path} must be an array`,
    );
  }

  const components = raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidDiagramPlanError(`Component at index ${index} must be an object`);
    }

    const component = entry as Record<string, unknown>;
    const fieldPath = `${path}[${index}]`;
    const id = readString(component.id, `${fieldPath}.id`);
    const label = readString(component.label, `${fieldPath}.label`);
    const kind = canonicalizeKind(component.kind, `${fieldPath}.kind`);

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

  return components;
}

function parseConnections(
  raw: unknown,
  components: DiagramComponent[],
  path: string,
): DiagramConnection[] {
  if (raw === undefined || raw === null) {
    return [];
  }

  if (!Array.isArray(raw)) {
    throw new InvalidDiagramPlanError(
      path === "connections"
        ? "Diagram plan connections must be an array"
        : `${path} must be an array`,
    );
  }

  const componentIds = new Set(components.map((component) => component.id));
  const seenPairs = new Set<string>();

  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidDiagramPlanError(`Connection at index ${index} must be an object`);
    }

    const connection = entry as Record<string, unknown>;
    const fieldPath = `${path}[${index}]`;
    const from = resolveConnectionComponentId(
      readString(connection.from, `${fieldPath}.from`),
      components,
      componentIds,
    );
    const to = resolveConnectionComponentId(
      readString(connection.to, `${fieldPath}.to`),
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

    const style = canonicalizeStyle(connection.style, `${fieldPath}.style`);

    const label =
      connection.label === undefined || connection.label === null
        ? undefined
        : readString(connection.label, `${fieldPath}.label`).trim();

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
