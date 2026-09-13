import { CANVAS_PAGE_ID } from "../canvas/records.js";
import { layoutDiagramPlan, type FlowLayout, type LayoutBox } from "./diagram-layout.js";
import type {
  ComponentKind,
  ConnectionStyle,
  DiagramConnection,
  DiagramFlow,
  DiagramPlan,
} from "./diagram-plan.js";
import type { GenerateResult } from "./types.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 100;
const ANCHOR_SPREAD_MIN = 0.28;
const ANCHOR_SPREAD_MAX = 0.72;
const LABEL_POSITION_START = 0.28;
const LABEL_POSITION_VERTICAL = 0.45;
const LABEL_MIDPOINT_BAND = 0.06;
const OPPOSITE_LANE_A = 0.34;
const OPPOSITE_LANE_B = 0.66;

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
  fill?: string;
  align?: string;
  size?: string;
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
      fill: options.fill ?? "solid",
      size: options.size ?? "m",
      font: "draw",
      align: options.align ?? "middle",
      verticalAlign: "middle",
      richText: toRichText(options.label),
    },
    meta: options.meta ?? {},
  };
}

export function buildRecordsFromDiagramPlan(plan: DiagramPlan): GenerateResult {
  const records: Record<string, unknown> = {};
  const layouts = layoutDiagramPlan(plan);
  const qualifyIds = plan.flows.length > 1;
  let shapeIndex = 0;

  plan.flows.forEach((flow, flowIndex) => {
    const layout = layouts[flowIndex];
    if (!layout) {
      return;
    }

    if (layout.title) {
      const titleId = `shape:flow-${flow.id}-title`;
      records[titleId] = buildGeoShape({
        id: titleId,
        label: layout.title.label,
        x: layout.title.x,
        y: layout.title.y,
        w: layout.title.w,
        h: layout.title.h,
        index: toShapeIndex(shapeIndex),
        color: "grey",
        fill: "none",
        align: "start",
        size: "l",
        meta: { generatedFrom: `flow:${flow.id}` },
      });
      shapeIndex += 1;
    }

    flow.components.forEach((component) => {
      const box = layout.boxes.get(component.id);
      if (!box) {
        return;
      }

      const shapeId = `shape:${recordComponentId(flow, component.id, qualifyIds)}`;

      records[shapeId] = buildGeoShape({
        id: shapeId,
        label: component.label,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        index: toShapeIndex(shapeIndex),
        color: KIND_COLORS[component.kind],
        meta: { generatedFrom: component.id, flow: flow.id },
      });
      shapeIndex += 1;
    });

    flow.connections.forEach((connection) => {
      const arrowRecords = buildConnectionRecords(
        flow,
        connection,
        flow.connections,
        layout,
        toShapeIndex(shapeIndex),
        qualifyIds,
      );

      Object.assign(records, arrowRecords);
      shapeIndex += 1;
    });
  });

  return { records };
}

function buildConnectionRecords(
  flow: DiagramFlow,
  connection: DiagramConnection,
  connections: DiagramConnection[],
  layout: FlowLayout,
  index: string,
  qualifyIds: boolean,
): Record<string, unknown> {
  const from = layout.boxes.get(connection.from);
  const to = layout.boxes.get(connection.to);

  if (!from || !to) {
    throw new Error(
      `Connection references unknown component: ${connection.from} -> ${connection.to}`,
    );
  }

  const fromId = recordComponentId(flow, connection.from, qualifyIds);
  const toId = recordComponentId(flow, connection.to, qualifyIds);
  const arrowId = `shape:arrow-${fromId}-to-${toId}`;
  const startBindingId = `binding:${fromId}-to-${toId}-start`;
  const endBindingId = `binding:${fromId}-to-${toId}-end`;
  const anchors = resolveConnectionAnchors(connection, connections, layout.boxes);

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
        size: "s",
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
        flow: flow.id,
      },
    },
    [startBindingId]: {
      id: startBindingId,
      typeName: "binding",
      type: "arrow",
      fromId: arrowId,
      toId: `shape:${fromId}`,
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
      toId: `shape:${toId}`,
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

function recordComponentId(flow: DiagramFlow, componentId: string, qualifyIds: boolean): string {
  if (!qualifyIds) {
    return componentId;
  }

  return `${flow.id}-${componentId}`;
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
  const base = anchorsForDirection(direction, from, to);
  const oppositeLane = oppositeLaneIndex(connection, connections);

  if (oppositeLane !== null) {
    return {
      start: applyLane(base.start, direction, oppositeLane),
      end: applyLane(base.end, direction, oppositeLane),
      labelPosition: arrowLabelPosition(0, 1, direction),
    };
  }

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
    labelPosition: arrowLabelPosition(outgoingIndex, outgoing.length, direction),
  };
}

function oppositeLaneIndex(
  connection: DiagramConnection,
  connections: DiagramConnection[],
): 0 | 1 | null {
  const hasReverse = connections.some(
    (candidate) => candidate.from === connection.to && candidate.to === connection.from,
  );
  if (!hasReverse) {
    return null;
  }

  return connection.from < connection.to ? 0 : 1;
}

function applyLane(anchor: Anchor, direction: EdgeDirection, lane: 0 | 1): Anchor {
  const offset = lane === 0 ? OPPOSITE_LANE_A : OPPOSITE_LANE_B;
  if (direction === "right" || direction === "left") {
    return { x: anchor.x, y: offset };
  }
  return { x: offset, y: anchor.y };
}

function edgeDirection(from: LayoutBox, to: LayoutBox): EdgeDirection {
  const fromBottom = from.y + from.h;
  const fromRight = from.x + from.w;
  const toBottom = to.y + to.h;
  const toRight = to.x + to.w;
  const verticalOverlap = from.y < toBottom && fromBottom > to.y;
  const horizontalOverlap = from.x < toRight && fromRight > to.x;

  if (!verticalOverlap) {
    return to.y >= fromBottom ? "down" : "up";
  }
  if (!horizontalOverlap) {
    return to.x >= fromRight ? "right" : "left";
  }

  const deltaX = to.x + to.w / 2 - (from.x + from.w / 2);
  const deltaY = to.y + to.h / 2 - (from.y + from.h / 2);
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0 ? "right" : "left";
  }
  return deltaY >= 0 ? "down" : "up";
}

function anchorsForDirection(
  direction: EdgeDirection,
  from: LayoutBox,
  to: LayoutBox,
): { start: Anchor; end: Anchor } {
  if (direction === "right") {
    return {
      start: { x: 1, y: 0.5 },
      end: to.y >= from.y + from.h ? { x: 0.5, y: 0 } : { x: 0, y: 0.5 },
    };
  }
  if (direction === "left") {
    return {
      start: { x: 0, y: 0.5 },
      end: to.y >= from.y + from.h ? { x: 0.5, y: 0 } : { x: 1, y: 0.5 },
    };
  }
  if (direction === "down") {
    return {
      start: { x: 0.5, y: 1 },
      end: to.x >= from.x + from.w ? { x: 0, y: 0.5 } : { x: 0.5, y: 0 },
    };
  }
  return {
    start: { x: 0.5, y: 0 },
    end: to.x >= from.x + from.w ? { x: 0, y: 0.5 } : { x: 0.5, y: 1 },
  };
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

function arrowLabelPosition(index: number, count: number, direction: EdgeDirection): number {
  if (direction === "down" || direction === "up") {
    return LABEL_POSITION_VERTICAL;
  }
  if (count <= 1) {
    return LABEL_POSITION_START;
  }

  const spread = spreadValue(index, count);
  if (Math.abs(spread - 0.5) < LABEL_MIDPOINT_BAND) {
    return LABEL_POSITION_START + 0.08;
  }

  return spread;
}

function toShapeIndex(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const first = alphabet[Math.floor(index / alphabet.length) % alphabet.length];
  const second = alphabet[index % alphabet.length];
  return `${first}${second}`;
}
