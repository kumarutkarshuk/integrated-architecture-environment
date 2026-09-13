import type {
  DiagramComponent,
  DiagramConnection,
  DiagramPlan,
} from "./diagram-plan.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 100;
const H_GAP = 260;
const V_GAP = 160;
const CANVAS_PADDING = 120;
const TITLE_HEIGHT = 56;
const TITLE_GAP = 16;
const FLOW_GAP = 200;

export interface LayoutBox {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowLayout {
  id: string;
  label: string;
  title: LayoutBox | null;
  boxes: Map<string, LayoutBox>;
}

export function layoutDiagramPlan(plan: DiagramPlan): FlowLayout[] {
  const showTitles = plan.flows.length > 1;
  let nextY = CANVAS_PADDING;
  const layouts: FlowLayout[] = [];

  for (const flow of plan.flows) {
    const local = layoutDiagramComponents(flow.components, flow.connections);
    const localBoxes = [...local.values()];
    const localMinY = Math.min(...localBoxes.map((box) => box.y));

    let title: LayoutBox | null = null;
    if (showTitles) {
      title = {
        id: `${flow.id}-title`,
        label: flow.label,
        x: CANVAS_PADDING,
        y: nextY,
        w: estimateWidth(flow.label),
        h: TITLE_HEIGHT,
      };
      nextY += TITLE_HEIGHT + TITLE_GAP;
    }

    const shiftY = nextY - localMinY;
    const boxes = new Map<string, LayoutBox>();
    for (const [id, box] of local) {
      boxes.set(id, { ...box, y: box.y + shiftY });
    }

    nextY = Math.max(...[...boxes.values()].map((box) => box.y + box.h)) + FLOW_GAP;
    layouts.push({ id: flow.id, label: flow.label, title, boxes });
  }

  return layouts;
}

export function layoutDiagramComponents(
  components: DiagramComponent[],
  connections: DiagramConnection[],
): Map<string, LayoutBox> {
  const boxes = new Map<string, LayoutBox>();

  for (const component of components) {
    boxes.set(component.id, {
      id: component.id,
      label: component.label,
      x: 0,
      y: 0,
      w: estimateWidth(component.label),
      h: DEFAULT_HEIGHT,
    });
  }

  if (components.length === 0) {
    return boxes;
  }

  const layers = assignLayers(components, connections);
  const layerGroups = groupByLayer(components, layers);

  let currentX = CANVAS_PADDING;
  for (const layerIndex of [...layerGroups.keys()].sort((a, b) => a - b)) {
    const layerComponents = layerGroups.get(layerIndex) ?? [];
    const layerWidth = Math.max(
      ...layerComponents.map((component) => boxes.get(component.id)!.w),
    );
    let currentY = CANVAS_PADDING;

    for (const component of layerComponents) {
      const box = boxes.get(component.id)!;
      box.x = currentX;
      box.y = currentY;
      currentY += box.h + V_GAP;
    }

    currentX += layerWidth + H_GAP;
  }

  return boxes;
}

function assignLayers(
  components: DiagramComponent[],
  connections: DiagramConnection[],
): Map<string, number> {
  const layers = new Map<string, number>();
  for (const component of components) {
    layers.set(component.id, 0);
  }

  if (connections.length === 0) {
    components.forEach((component, index) => {
      layers.set(component.id, index);
    });
    return layers;
  }

  // Relax edges like Bellman-Ford: in an acyclic graph, layers converge in at
  // most `components.length` passes. Cap iterations at that bound so a cycle
  // in the AI-generated connections (e.g. A -> B -> A) can't spin the loop
  // forever and freeze the server's event loop.
  const maxIterations = components.length;
  let changed = true;
  for (let iteration = 0; changed && iteration < maxIterations; iteration += 1) {
    changed = false;
    for (const connection of connections) {
      const fromLayer = layers.get(connection.from) ?? 0;
      const toLayer = layers.get(connection.to) ?? 0;
      if (toLayer <= fromLayer) {
        layers.set(connection.to, fromLayer + 1);
        changed = true;
      }
    }
  }

  return layers;
}

function groupByLayer(
  components: DiagramComponent[],
  layers: Map<string, number>,
): Map<number, DiagramComponent[]> {
  const groups = new Map<number, DiagramComponent[]>();

  for (const component of components) {
    const layer = layers.get(component.id) ?? 0;
    const group = groups.get(layer) ?? [];
    group.push(component);
    groups.set(layer, group);
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.label.localeCompare(b.label));
  }

  return groups;
}

function estimateWidth(label: string): number {
  return Math.max(DEFAULT_WIDTH, Math.min(320, label.length * 12 + 48));
}
