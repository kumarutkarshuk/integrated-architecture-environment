import type { LayoutBox } from "./diagram-layout.js";
import type { DiagramConnection } from "./diagram-plan.js";

const CONNECTION_EDGES = ["left", "right", "top", "bottom"] as const;
const LABEL_SLOTS = [0.28, 0.72, 0.45, 0.38, 0.62];
const ALONG_SLOTS = [0.5, 0.34, 0.66, 0.22, 0.78];
const CORRIDOR_OUT = 48;

export type ConnectionEdge = (typeof CONNECTION_EDGES)[number];

export type PlacedConnection = {
  from: string;
  to: string;
  fromEdge: ConnectionEdge;
  toEdge: ConnectionEdge;
  along: number;
  labelPosition: number;
};

type Rect = { x: number; y: number; w: number; h: number };

export function placeDiagramConnections(
  boxes: Map<string, LayoutBox>,
  connections: DiagramConnection[],
): PlacedConnection[] {
  const placed: PlacedConnection[] = [];
  for (const connection of connections) {
    const from = boxes.get(connection.from);
    const to = boxes.get(connection.to);
    if (!from || !to) {
      throw new Error(
        `Connection references unknown component: ${connection.from} -> ${connection.to}`,
      );
    }
    placed.push({
      from: connection.from,
      to: connection.to,
      ...pickConnectionPlacement(from, to, boxes, placed),
    });
  }
  return placed;
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

function pickConnectionPlacement(
  from: LayoutBox,
  to: LayoutBox,
  boxes: Map<string, LayoutBox>,
  placed: PlacedConnection[],
): {
  fromEdge: ConnectionEdge;
  toEdge: ConnectionEdge;
  along: number;
  labelPosition: number;
} {
  const pair = pairConnections(placed, from.id, to.id);
  const isReverse = pair.some((item) => item.from === to.id && item.to === from.id);
  const usedFrom = isReverse
    ? new Set<ConnectionEdge>()
    : occupiedPairEdges(placed, from.id, to.id, boxes);
  const usedTo = isReverse
    ? new Set<ConnectionEdge>()
    : occupiedPairEdges(placed, to.id, from.id, boxes);
  const geometric = geometricEdges(from, to);
  const candidates: Array<{ fromEdge: ConnectionEdge; toEdge: ConnectionEdge }> = [
    geometric,
  ];
  if (geometric.fromEdge === "right" || geometric.fromEdge === "left") {
    candidates.push(
      { fromEdge: "top", toEdge: "top" },
      { fromEdge: "bottom", toEdge: "bottom" },
      { fromEdge: "top", toEdge: "bottom" },
      { fromEdge: "bottom", toEdge: "top" },
    );
  } else {
    candidates.push(
      { fromEdge: "right", toEdge: "right" },
      { fromEdge: "left", toEdge: "left" },
      { fromEdge: "right", toEdge: "left" },
      { fromEdge: "left", toEdge: "right" },
    );
  }
  for (const fromEdge of CONNECTION_EDGES) {
    for (const toEdge of CONNECTION_EDGES) {
      candidates.push({ fromEdge, toEdge });
    }
  }

  const obstacles = [...boxes.values()].filter(
    (box) => box.id !== from.id && box.id !== to.id,
  );
  const clear = (candidate: {
    fromEdge: ConnectionEdge;
    toEdge: ConnectionEdge;
  }) => !corridorHits(from, to, candidate.fromEdge, candidate.toEdge, obstacles);

  let edges = geometric;
  for (const candidate of candidates) {
    if (
      !usedFrom.has(candidate.fromEdge) &&
      !usedTo.has(candidate.toEdge) &&
      clear(candidate)
    ) {
      edges = candidate;
      break;
    }
  }
  if (corridorHits(from, to, edges.fromEdge, edges.toEdge, obstacles)) {
    for (const candidate of candidates) {
      if (clear(candidate)) {
        edges = candidate;
        break;
      }
    }
  }

  return {
    ...edges,
    along: pickAlong(placed, from.id, edges.fromEdge, to.id, edges.toEdge),
    labelPosition: pickLabelPosition(
      placed,
      from.id,
      edges.fromEdge,
      to.id,
      edges.toEdge,
    ),
  };
}

function geometricEdges(
  from: LayoutBox,
  to: LayoutBox,
): { fromEdge: ConnectionEdge; toEdge: ConnectionEdge } {
  const deltaX = to.x + to.w / 2 - (from.x + from.w / 2);
  const deltaY = to.y + to.h / 2 - (from.y + from.h / 2);
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX >= 0) {
      return { fromEdge: "right", toEdge: "left" };
    }
    return { fromEdge: "left", toEdge: "right" };
  }
  if (deltaY >= 0) {
    return { fromEdge: "bottom", toEdge: "top" };
  }
  return { fromEdge: "top", toEdge: "bottom" };
}

function occupiedPairEdges(
  placed: PlacedConnection[],
  shapeId: string,
  partnerId: string,
  boxes: Map<string, LayoutBox>,
): Set<ConnectionEdge> {
  const used = new Set<ConnectionEdge>();
  for (const connection of placed) {
    const isPair =
      (connection.from === shapeId && connection.to === partnerId) ||
      (connection.from === partnerId && connection.to === shapeId);
    if (!isPair) {
      continue;
    }
    const fromBox = boxes.get(connection.from);
    const toBox = boxes.get(connection.to);
    if (!fromBox || !toBox) {
      continue;
    }
    const inferred = geometricEdges(fromBox, toBox);
    if (connection.from === shapeId) {
      used.add(connection.fromEdge || inferred.fromEdge);
    }
    if (connection.to === shapeId) {
      used.add(connection.toEdge || inferred.toEdge);
    }
  }
  return used;
}

function pairConnections(
  placed: PlacedConnection[],
  fromId: string,
  toId: string,
): PlacedConnection[] {
  return placed.filter(
    (connection) =>
      (connection.from === fromId && connection.to === toId) ||
      (connection.from === toId && connection.to === fromId),
  );
}

function pickLabelPosition(
  placed: PlacedConnection[],
  fromId: string,
  fromEdge: ConnectionEdge,
  toId: string,
  toEdge: ConnectionEdge,
): number {
  const pair = pairConnections(placed, fromId, toId);
  const used = pair.map((item) => item.labelPosition);
  for (const connection of placed) {
    if (pair.some((item) => item === connection)) {
      continue;
    }
    const sharesEdge =
      (connection.from === fromId && connection.fromEdge === fromEdge) ||
      (connection.to === fromId && connection.toEdge === fromEdge) ||
      (connection.from === toId && connection.fromEdge === toEdge) ||
      (connection.to === toId && connection.toEdge === toEdge);
    if (sharesEdge) {
      used.push(connection.labelPosition);
    }
  }
  for (const slot of LABEL_SLOTS) {
    if (used.every((value) => Math.abs(value - slot) > 0.08)) {
      return slot;
    }
  }
  return LABEL_SLOTS[used.length % LABEL_SLOTS.length] ?? 0.28;
}

function pointOnEdge(
  box: LayoutBox,
  edge: ConnectionEdge,
  along: number,
): { x: number; y: number } {
  if (edge === "left") {
    return { x: box.x, y: box.y + box.h * along };
  }
  if (edge === "right") {
    return { x: box.x + box.w, y: box.y + box.h * along };
  }
  if (edge === "top") {
    return { x: box.x + box.w * along, y: box.y };
  }
  return { x: box.x + box.w * along, y: box.y + box.h };
}

function offsetOut(
  point: { x: number; y: number },
  edge: ConnectionEdge,
  pad: number,
): { x: number; y: number } {
  if (edge === "left") {
    return { x: point.x - pad, y: point.y };
  }
  if (edge === "right") {
    return { x: point.x + pad, y: point.y };
  }
  if (edge === "top") {
    return { x: point.x, y: point.y - pad };
  }
  return { x: point.x, y: point.y + pad };
}

function corridorHits(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
  obstacles: Rect[],
): boolean {
  const start = pointOnEdge(from, fromEdge, 0.5);
  const end = pointOnEdge(to, toEdge, 0.5);
  const startOut = offsetOut(start, fromEdge, CORRIDOR_OUT);
  const endOut = offsetOut(end, toEdge, CORRIDOR_OUT);
  const mid =
    Math.abs(startOut.x - endOut.x) < 1 || Math.abs(startOut.y - endOut.y) < 1
      ? []
      : [{ x: startOut.x, y: endOut.y }];
  const points = [start, startOut, ...mid, endOut, end];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (!a || !b) {
      continue;
    }
    if (obstacles.some((rect) => segmentHitsRect(a, b, rect))) {
      return true;
    }
  }
  return false;
}

function segmentHitsRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  rect: Rect,
): boolean {
  const pad = 8;
  const left = rect.x - pad;
  const right = rect.x + rect.w + pad;
  const top = rect.y - pad;
  const bottom = rect.y + rect.h + pad;
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  return maxX >= left && minX <= right && maxY >= top && minY <= bottom;
}

function pickAlong(
  placed: PlacedConnection[],
  fromId: string,
  fromEdge: ConnectionEdge,
  toId: string,
  toEdge: ConnectionEdge,
): number {
  const used: number[] = [];
  for (const connection of placed) {
    if (connection.from === fromId && connection.fromEdge === fromEdge) {
      used.push(connection.along);
    }
    if (connection.to === fromId && connection.toEdge === fromEdge) {
      used.push(connection.along);
    }
    if (connection.from === toId && connection.fromEdge === toEdge) {
      used.push(connection.along);
    }
    if (connection.to === toId && connection.toEdge === toEdge) {
      used.push(connection.along);
    }
  }
  for (const slot of ALONG_SLOTS) {
    if (used.every((value) => Math.abs(value - slot) > 0.1)) {
      return slot;
    }
  }
  return 0.5;
}
