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
  const geometric = geometricEdges(from, to);
  const usedFrom = occupiedBoxEdges(placed, from.id);
  const usedTo = occupiedBoxEdges(placed, to.id);
  if (isReverse) {
    for (const item of pair) {
      if (item.from === from.id) {
        usedFrom.delete(item.fromEdge);
      }
      if (item.to === from.id) {
        usedFrom.delete(item.toEdge);
      }
      if (item.from === to.id) {
        usedTo.delete(item.fromEdge);
      }
      if (item.to === to.id) {
        usedTo.delete(item.toEdge);
      }
    }
  }

  const candidates = edgeCandidates(from, to, geometric);
  const obstacles = [...boxes.values()].filter(
    (box) => box.id !== from.id && box.id !== to.id,
  );
  const clear = (candidate: {
    fromEdge: ConnectionEdge;
    toEdge: ConnectionEdge;
  }) =>
    !usesSideOnDiagonal(from, to, candidate.fromEdge, candidate.toEdge) &&
    !corridorHits(from, to, candidate.fromEdge, candidate.toEdge, obstacles) &&
    !corridorHitsArrows(from, to, candidate.fromEdge, candidate.toEdge, placed, boxes);

  let edges = geometric;
  let found = false;
  for (const candidate of candidates) {
    if (
      !usedFrom.has(candidate.fromEdge) &&
      !usedTo.has(candidate.toEdge) &&
      clear(candidate)
    ) {
      edges = candidate;
      found = true;
      break;
    }
  }
  if (!found) {
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
      from,
      to,
      edges.fromEdge,
      edges.toEdge,
      placed,
      boxes,
    ),
  };
}

function edgeCandidates(
  from: LayoutBox,
  to: LayoutBox,
  geometric: { fromEdge: ConnectionEdge; toEdge: ConnectionEdge },
): Array<{ fromEdge: ConnectionEdge; toEdge: ConnectionEdge }> {
  const candidates: Array<{ fromEdge: ConnectionEdge; toEdge: ConnectionEdge }> = [
    geometric,
  ];
  const targetBelow = to.y >= from.y + from.h;
  const targetAbove = to.y + to.h <= from.y;
  if (geometric.fromEdge === "right" || geometric.fromEdge === "left") {
    const vertical = targetBelow
      ? ([
          { fromEdge: "bottom", toEdge: "bottom" },
          { fromEdge: "bottom", toEdge: "top" },
          { fromEdge: "top", toEdge: "bottom" },
          { fromEdge: "top", toEdge: "top" },
        ] as const)
      : targetAbove
        ? ([
            { fromEdge: "top", toEdge: "top" },
            { fromEdge: "top", toEdge: "bottom" },
            { fromEdge: "bottom", toEdge: "top" },
            { fromEdge: "bottom", toEdge: "bottom" },
          ] as const)
        : ([
            { fromEdge: "top", toEdge: "top" },
            { fromEdge: "bottom", toEdge: "bottom" },
            { fromEdge: "top", toEdge: "bottom" },
            { fromEdge: "bottom", toEdge: "top" },
          ] as const);
    candidates.push(...vertical);
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
  return candidates;
}

function occupiedBoxEdges(
  placed: PlacedConnection[],
  shapeId: string,
): Set<ConnectionEdge> {
  const used = new Set<ConnectionEdge>();
  for (const connection of placed) {
    if (connection.from === shapeId) {
      used.add(connection.fromEdge);
    }
    if (connection.to === shapeId) {
      used.add(connection.toEdge);
    }
  }
  return used;
}

function geometricEdges(
  from: LayoutBox,
  to: LayoutBox,
): { fromEdge: ConnectionEdge; toEdge: ConnectionEdge } {
  const vOverlap = from.y < to.y + to.h && from.y + from.h > to.y;
  if (vOverlap) {
    if (to.x + to.w / 2 >= from.x + from.w / 2) {
      return { fromEdge: "right", toEdge: "left" };
    }
    return { fromEdge: "left", toEdge: "right" };
  }
  if (to.y >= from.y + from.h) {
    return { fromEdge: "bottom", toEdge: "top" };
  }
  return { fromEdge: "top", toEdge: "bottom" };
}

function usesSideOnDiagonal(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
): boolean {
  const vOverlap = from.y < to.y + to.h && from.y + from.h > to.y;
  if (vOverlap) {
    return false;
  }
  return (
    fromEdge === "left" ||
    fromEdge === "right" ||
    toEdge === "left" ||
    toEdge === "right"
  );
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

export function connectionPathPoints(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
): Array<{ x: number; y: number }> {
  return corridorPoints(from, to, fromEdge, toEdge);
}

export function connectionLabelPoint(
  from: LayoutBox,
  to: LayoutBox,
  placement: Pick<PlacedConnection, "fromEdge" | "toEdge" | "labelPosition">,
): { x: number; y: number } {
  return pointAlongPath(
    corridorPoints(from, to, placement.fromEdge, placement.toEdge),
    placement.labelPosition,
  );
}

function pickLabelPosition(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
  placed: PlacedConnection[],
  boxes: Map<string, LayoutBox>,
): number {
  const points = corridorPoints(from, to, fromEdge, toEdge);
  const candidates = labelSlotsOnPath(points);
  const usedT = placed.map((item) => item.labelPosition);
  const usedPoints = placed.map((item) => {
    const start = boxes.get(item.from);
    const end = boxes.get(item.to);
    if (!start || !end) {
      return null;
    }
    return connectionLabelPoint(start, end, item);
  });

  for (const slot of candidates) {
    if (usedT.some((value) => Math.abs(value - slot) < 0.12)) {
      continue;
    }
    const point = pointAlongPath(points, slot);
    if (
      usedPoints.every(
        (other) => !other || Math.hypot(point.x - other.x, point.y - other.y) > 56,
      )
    ) {
      return slot;
    }
  }

  return candidates.find((slot) => usedT.every((value) => Math.abs(value - slot) > 0.12))
    ?? candidates[0]
    ?? 0.4;
}

function labelSlotsOnPath(points: Array<{ x: number; y: number }>): number[] {
  const segments: Array<{ start: number; length: number }> = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (!a || !b) {
      continue;
    }
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ start: total, length });
    total += length;
  }
  if (total <= 0) {
    return [...LABEL_SLOTS];
  }

  const slots: number[] = [];
  const ordered = [...segments].sort((a, b) => b.length - a.length);
  for (const segment of ordered) {
    if (segment.length < 64) {
      continue;
    }
    for (const t of [0.5, 0.34, 0.66, 0.25, 0.75]) {
      const inset = Math.min(24, segment.length / 4);
      const along = Math.min(
        Math.max(segment.length * t, inset),
        segment.length - inset,
      );
      slots.push((segment.start + along) / total);
    }
  }

  return slots.length > 0 ? slots : [...LABEL_SLOTS];
}

function pointAlongPath(
  points: Array<{ x: number; y: number }>,
  t: number,
): { x: number; y: number } {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0]!;
  }

  let total = 0;
  const lengths: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(length);
    total += length;
  }
  if (total <= 0) {
    return points[0]!;
  }

  let remaining = Math.min(1, Math.max(0, t)) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]!;
    const a = points[index]!;
    const b = points[index + 1]!;
    if (remaining <= length || index === lengths.length - 1) {
      const ratio = length === 0 ? 0 : remaining / length;
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
      };
    }
    remaining -= length;
  }

  return points[points.length - 1]!;
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

function corridorPoints(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
): Array<{ x: number; y: number }> {
  const start = pointOnEdge(from, fromEdge, 0.5);
  const end = pointOnEdge(to, toEdge, 0.5);
  const startOut = offsetOut(start, fromEdge, CORRIDOR_OUT);
  const endOut = offsetOut(end, toEdge, CORRIDOR_OUT);
  const mid =
    Math.abs(startOut.x - endOut.x) < 1 || Math.abs(startOut.y - endOut.y) < 1
      ? []
      : [{ x: startOut.x, y: endOut.y }];
  return [start, startOut, ...mid, endOut, end];
}

function corridorHits(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
  obstacles: Rect[],
): boolean {
  const points = corridorPoints(from, to, fromEdge, toEdge);
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

function corridorHitsArrows(
  from: LayoutBox,
  to: LayoutBox,
  fromEdge: ConnectionEdge,
  toEdge: ConnectionEdge,
  placed: PlacedConnection[],
  boxes: Map<string, LayoutBox>,
): boolean {
  const next = corridorPoints(from, to, fromEdge, toEdge);
  for (const connection of placed) {
    const samePair =
      (connection.from === from.id && connection.to === to.id) ||
      (connection.from === to.id && connection.to === from.id);
    if (samePair) {
      continue;
    }
    const start = boxes.get(connection.from);
    const end = boxes.get(connection.to);
    if (!start || !end) {
      continue;
    }
    const previous = corridorPoints(
      start,
      end,
      connection.fromEdge,
      connection.toEdge,
    );
    if (polylinesTooClose(next, previous, 36)) {
      return true;
    }
  }
  return false;
}

function polylinesTooClose(
  first: Array<{ x: number; y: number }>,
  second: Array<{ x: number; y: number }>,
  pad: number,
): boolean {
  for (let i = 0; i < first.length - 1; i += 1) {
    const a = first[i];
    const b = first[i + 1];
    if (!a || !b) {
      continue;
    }
    for (let j = 0; j < second.length - 1; j += 1) {
      const c = second[j];
      const d = second[j + 1];
      if (!c || !d) {
        continue;
      }
      if (segmentHitsRect(a, b, segmentRect(c, d, pad))) {
        return true;
      }
    }
  }
  return false;
}

function segmentRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  pad: number,
): Rect {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.abs(a.x - b.x) + pad * 2,
    h: Math.abs(a.y - b.y) + pad * 2,
  };
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
