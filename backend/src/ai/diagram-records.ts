import { CANVAS_PAGE_ID } from "../canvas/records.js";
import { layoutDiagramComponents, type LayoutBox } from "./diagram-layout.js";
import type {
  ComponentKind,
  ConnectionStyle,
  DiagramConnection,
  DiagramPlan,
} from "./diagram-plan.js";
import type { GenerateResult } from "./types.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 100;
const ANCHOR_SPREAD_MIN = 0.28;
const ANCHOR_SPREAD_MAX = 0.72;

const KIND_COLORS: Record<ComponentKind, string> = {
  client: "blue",
  service: "violet",
  store: "green",
  queue: "orange",
  storage: "yellow",
  external: "grey",
};

const STYLE_DASH: Record<ConnectionStyle, string> = {
  sync: "solid",
  async: "dashed",
  data: "dotted",
};

type Anchor = { x: number; y: number };
type EdgeDirection = "right" | "left" | "down" | "up";

export function toRichText(text: string) {
  return {
    type: "doc",
    content: text.split("\n").map((line) =>
      line
        ? {
            type: "paragraph",
            content: [{ type: "text", text: line }],
          }
        : { type: "paragraph" },
    ),
  };
}

export function buildGeoShape(options: {
  id: string;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  index: string;
  color?: string;
  meta?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: options.id,
    typeName: "shape",
    type: "geo",
    x: options.x,
    y: options.y,
    rotation: 0,
    index: options.index,
    parentId: CANVAS_PAGE_ID,
    isLocked: false,
    opacity: 1,
    props: {
      geo: "rectangle",
      dash: "solid",
      url: "",
      w: options.w ?? DEFAULT_WIDTH,
      h: options.h ?? DEFAULT_HEIGHT,
      growY: 0,
      scale: 1,
      flipX: false,
      flipY: false,
      labelColor: "black",
      color: options.color ?? "black",
      fill: "solid",
      size: "m",
      font: "draw",
      align: "middle",
      verticalAlign: "middle",
      richText: toRichText(options.label),
    },
    meta: options.meta ?? {},
  };
}

export function buildRecordsFromDiagramPlan(plan: DiagramPlan): GenerateResult {
  const records: Record<string, unknown> = {};
  const layout = layoutDiagramComponents(plan.components, plan.connections);

  plan.components.forEach((component, index) => {
    const box = layout.get(component.id);
    if (!box) {
      return;
    }

    const shapeId = `shape:${component.id}`;

    records[shapeId] = buildGeoShape({
      id: shapeId,
      label: component.label,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      index: toShapeIndex(index),
      color: KIND_COLORS[component.kind],
      meta: { generatedFrom: component.id },
    });
  });

  plan.connections.forEach((connection, index) => {
    const arrowRecords = buildConnectionRecords(
      connection,
      plan.connections,
      layout,
      toShapeIndex(plan.components.length + index),
    );

    Object.assign(records, arrowRecords);
  });

  return { records };
}

function buildConnectionRecords(
  connection: DiagramConnection,
  connections: DiagramConnection[],
  layout: Map<string, LayoutBox>,
  index: string,
): Record<string, unknown> {
  const from = layout.get(connection.from);
  const to = layout.get(connection.to);

  if (!from || !to) {
    throw new Error(
      `Connection references unknown component: ${connection.from} -> ${connection.to}`,
    );
  }

  const arrowId = `shape:arrow-${connection.from}-to-${connection.to}`;
  const startBindingId = `binding:${connection.from}-to-${connection.to}-start`;
  const endBindingId = `binding:${connection.from}-to-${connection.to}-end`;
  const anchors = resolveConnectionAnchors(connection, connections, layout);

  return {
    [arrowId]: {
      id: arrowId,
      typeName: "shape",
      type: "arrow",
      x: from.x + anchors.start.x * from.w,
      y: from.y + anchors.start.y * from.h,
      rotation: 0,
      index,
      parentId: CANVAS_PAGE_ID,
      isLocked: false,
      opacity: 1,
      props: {
        kind: "elbow",
        labelColor: "black",
        color: "black",
        fill: "none",
        dash: STYLE_DASH[connection.style],
        size: "m",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        font: "draw",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
        bend: 0,
        richText: toRichText(connection.label ?? ""),
        labelPosition: anchors.labelPosition,
        scale: 1,
        elbowMidPoint: 0.5,
      },
      meta: {
        generatedFrom: `${connection.from}->${connection.to}`,
      },
    },
    [startBindingId]: {
      id: startBindingId,
      typeName: "binding",
      type: "arrow",
      fromId: arrowId,
      toId: `shape:${connection.from}`,
      meta: {},
      props: {
        terminal: "start",
        normalizedAnchor: anchors.start,
        isExact: false,
        isPrecise: false,
        snap: "edge",
      },
    },
    [endBindingId]: {
      id: endBindingId,
      typeName: "binding",
      type: "arrow",
      fromId: arrowId,
      toId: `shape:${connection.to}`,
      meta: {},
      props: {
        terminal: "end",
        normalizedAnchor: anchors.end,
        isExact: false,
        isPrecise: false,
        snap: "edge",
      },
    },
  };
}

function resolveConnectionAnchors(
  connection: DiagramConnection,
  connections: DiagramConnection[],
  layout: Map<string, LayoutBox>,
): {
  start: Anchor;
  end: Anchor;
  labelPosition: number;
} {
  const from = layout.get(connection.from)!;
  const to = layout.get(connection.to)!;
  const direction = edgeDirection(from, to);
  const base = anchorsForDirection(direction);

  const outgoing = connections.filter((candidate) => {
    const candidateFrom = layout.get(candidate.from);
    const candidateTo = layout.get(candidate.to);
    return (
      candidate.from === connection.from &&
      candidateFrom &&
      candidateTo &&
      edgeDirection(candidateFrom, candidateTo) === direction
    );
  });
  const incoming = connections.filter((candidate) => {
    const candidateFrom = layout.get(candidate.from);
    const candidateTo = layout.get(candidate.to);
    return (
      candidate.to === connection.to &&
      candidateFrom &&
      candidateTo &&
      edgeDirection(candidateFrom, candidateTo) === direction
    );
  });

  const outgoingIndex = outgoing.findIndex((candidate) => candidate === connection);

  return {
    start: offsetAnchor(base.start, outgoingIndex, outgoing.length),
    end: offsetAnchor(
      base.end,
      incoming.findIndex((candidate) => candidate === connection),
      incoming.length,
    ),
    labelPosition: spreadValue(outgoingIndex, outgoing.length),
  };
}

function edgeDirection(from: LayoutBox, to: LayoutBox): EdgeDirection {
  const fromCenterX = from.x + from.w / 2;
  const fromCenterY = from.y + from.h / 2;
  const toCenterX = to.x + to.w / 2;
  const toCenterY = to.y + to.h / 2;
  const deltaX = toCenterX - fromCenterX;
  const deltaY = toCenterY - fromCenterY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaY >= 0 ? "down" : "up";
}

function anchorsForDirection(direction: EdgeDirection): { start: Anchor; end: Anchor } {
  if (direction === "right") {
    return { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } };
  }
  if (direction === "left") {
    return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
  }
  if (direction === "down") {
    return { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } };
  }
  return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
}

function offsetAnchor(anchor: Anchor, index: number, count: number): Anchor {
  const spread = spreadValue(index, count);
  if (anchor.x === 0 || anchor.x === 1) {
    return { x: anchor.x, y: spread };
  }
  return { x: spread, y: anchor.y };
}

function spreadValue(index: number, count: number): number {
  if (count <= 1) {
    return 0.5;
  }
  const t = index / (count - 1);
  return ANCHOR_SPREAD_MIN + t * (ANCHOR_SPREAD_MAX - ANCHOR_SPREAD_MIN);
}

function toShapeIndex(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const first = alphabet[Math.floor(index / alphabet.length) % alphabet.length];
  const second = alphabet[index % alphabet.length];
  return `${first}${second}`;
}
