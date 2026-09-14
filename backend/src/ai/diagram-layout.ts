import type {
  DiagramComponent,
  DiagramConnection,
  DiagramPlan,
} from "./diagram-plan.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 100;
const BOX_GAP = 260;
const V_GAP = 160;
const TITLE_HEIGHT = 80;
const TITLE_GAP = 40;
const TITLE_MAX_WIDTH = 420;
const TITLE_CHAR_WIDTH = 16;
const TITLE_LINE_HEIGHT = 40;
const FLOW_GAP = 200;
const CANVAS_PADDING = 120;
const LABEL_CHAR_WIDTH = 9;
const LABEL_PAD = 64;

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

type Rect = { x: number; y: number; w: number; h: number };

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
      const size = titleSize(flow.label);
      title = {
        id: `${flow.id}-title`,
        label: flow.label,
        x: CANVAS_PADDING,
        y: nextY,
        w: size.w,
        h: size.h,
      };
      nextY += size.h + TITLE_GAP;
    }

    const shiftY = nextY - localMinY;
    const boxes = new Map<string, LayoutBox>();
    for (const [id, box] of local) {
      boxes.set(id, { ...box, y: box.y + shiftY });
    }

    spreadBoxesForLabels(boxes, flow.connections);
    resolveCollisions(boxes, title);

    const occupied = [
      ...(title ? [title] : []),
      ...boxes.values(),
    ];
    nextY = Math.max(...occupied.map((box) => box.y + box.h)) + FLOW_GAP;
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

    currentX += layerWidth + BOX_GAP;
  }

  spreadBoxesForLabels(boxes, connections);
  resolveCollisions(boxes, null);

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

function titleSize(label: string): { w: number; h: number } {
  const needed = Math.max(DEFAULT_WIDTH, label.trim().length * TITLE_CHAR_WIDTH + 72);
  const w = Math.min(TITLE_MAX_WIDTH, needed);
  const lines = Math.max(1, Math.ceil(needed / w));
  return {
    w,
    h: Math.max(TITLE_HEIGHT, lines * TITLE_LINE_HEIGHT + 16),
  };
}

function neededLabelGap(label: string | undefined): number {
  if (!label?.trim()) {
    return BOX_GAP;
  }
  return Math.max(BOX_GAP, LABEL_PAD + label.trim().length * LABEL_CHAR_WIDTH);
}

function spreadBoxesForLabels(
  boxes: Map<string, LayoutBox>,
  connections: DiagramConnection[],
): void {
  for (const connection of connections) {
    const from = boxes.get(connection.from);
    const to = boxes.get(connection.to);
    if (!from || !to) {
      continue;
    }
    const vOverlap = from.y < to.y + to.h && from.y + from.h > to.y;
    if (!vOverlap) {
      continue;
    }
    const left = from.x <= to.x ? from : to;
    const right = from.x <= to.x ? to : from;
    const needed = neededLabelGap(connection.label);
    const gap = right.x - (left.x + left.w);
    if (gap >= needed) {
      continue;
    }
    const dx = needed - gap;
    for (const box of boxes.values()) {
      if (Math.abs(box.y - right.y) < DEFAULT_HEIGHT / 2 && box.x >= right.x) {
        box.x += dx;
      }
    }
  }
}

function resolveCollisions(boxes: Map<string, LayoutBox>, title: LayoutBox | null): void {
  const items = [...boxes.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < items.length; i += 1) {
    const current = items[i]!;
    const occupied: Rect[] = [
      ...(title ? [title] : []),
      ...items.slice(0, i),
    ];
    while (collides(current, occupied)) {
      const hit = occupied.find((item) => tooClose(current, item));
      if (!hit) {
        break;
      }
      if (current.x < hit.x + hit.w && current.x + current.w > hit.x) {
        current.y = hit.y + hit.h + TITLE_GAP;
      } else {
        current.x = hit.x + hit.w + BOX_GAP;
      }
    }
  }
}

function collides(rect: Rect, occupied: Rect[]): boolean {
  return occupied.some((item) => tooClose(rect, item));
}

function tooClose(a: Rect, b: Rect): boolean {
  const hOverlap = a.x < b.x + b.w && a.x + a.w > b.x;
  const vOverlap = a.y < b.y + b.h && a.y + a.h > b.y;
  if (hOverlap && vOverlap) {
    return true;
  }
  const hClear = a.x >= b.x + b.w ? a.x - (b.x + b.w) : b.x - (a.x + a.w);
  const vClear = a.y >= b.y + b.h ? a.y - (b.y + b.h) : b.y - (a.y + a.h);
  if (vOverlap && hClear < BOX_GAP) {
    return true;
  }
  if (hOverlap && vClear < TITLE_GAP) {
    return true;
  }
  return false;
}
