export interface DiagramComponent {
  id: string;
  label: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface DiagramConnection {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramPlan {
  components: DiagramComponent[];
  connections: DiagramConnection[];
}

export function parseDiagramPlan(raw: unknown): DiagramPlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Diagram plan must be an object");
  }

  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.components)) {
    throw new Error("Diagram plan must include a components array");
  }

  const components = value.components.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Component at index ${index} must be an object`);
    }

    const component = entry as Record<string, unknown>;
    const id = readString(component.id, `components[${index}].id`);
    const label = readString(component.label, `components[${index}].label`);

    return {
      id: slugifyComponentId(id),
      label: label.trim(),
      x: readOptionalNumber(component.x, `components[${index}].x`),
      y: readOptionalNumber(component.y, `components[${index}].y`),
      w: readOptionalNumber(component.w, `components[${index}].w`),
      h: readOptionalNumber(component.h, `components[${index}].h`),
    };
  });

  if (components.length === 0) {
    throw new Error("Diagram plan must include at least one component");
  }

  const componentIds = new Set<string>();
  for (const component of components) {
    if (componentIds.has(component.id)) {
      throw new Error(`Duplicate component id: ${component.id}`);
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
    throw new Error("Diagram plan connections must be an array");
  }

  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Connection at index ${index} must be an object`);
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
      throw new Error(`Connection cannot point from a component to itself: ${from}`);
    }

    const label =
      connection.label === undefined || connection.label === null
        ? undefined
        : readString(connection.label, `connections[${index}].label`).trim();

    return { from, to, label };
  });
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

  throw new Error(`Connection references unknown component: ${slug}`);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function readOptionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a number`);
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
    throw new Error("Component id must contain letters or numbers");
  }

  return slug;
}
