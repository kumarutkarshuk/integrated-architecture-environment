import type { ArmBus, ArmedProject } from "./arm-bus";
import {
  CONNECTION_EDGES,
  KIND_COLORS,
  STYLE_DASH,
  kindFromColor,
  parseComponentKind,
  parseConnectionEdge,
  parseConnectionStyle,
  styleFromDash,
  type ComponentKind,
  type ConnectionEdge,
  type ConnectionStyle,
} from "./kinds";

const BOX_WIDTH = 220;
const BOX_HEIGHT = 100;
const TITLE_HEIGHT = 80;
const TITLE_GAP = 40;
const TITLE_MAX_WIDTH = 420;
const TITLE_CHAR_WIDTH = 16;
const TITLE_LINE_HEIGHT = 40;
const BOX_GAP = 260;
const FLOW_GAP = 200;
const CANVAS_PADDING = 120;

export class CanvasAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasAgentError";
  }
}

export type CanvasAgentPageShape = {
  id: string;
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  geo?: string;
  color?: string;
  fill?: string;
  dash?: string;
  size?: string;
  label: string;
  generatedFrom?: string;
  fromShapeId?: string;
  toShapeId?: string;
  fromEdge?: string;
  toEdge?: string;
  fromAlong?: number;
  toAlong?: number;
  labelPosition?: number;
};

export type ShapeBounds = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CanvasAgentEditorPort = {
  getCurrentPageShapes(): CanvasAgentPageShape[];
  isWritable(): boolean;
  getShapeBounds(id: string): ShapeBounds | null;
  createShape(shape: CanvasAgentPageShape): void;
  updateShape(
    id: string,
    patch: Partial<Pick<CanvasAgentPageShape, "x" | "y" | "label">>,
  ): void;
  deleteShape(id: string): void;
  zoomToBounds(bounds: ShapeBounds): void;
  zoomIn(): void;
  zoomOut(): void;
  clampZoom(max: number): void;
};

export type CompactComponent = {
  id: string;
  label: string;
  kind: ComponentKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CompactConnection = {
  id: string;
  from: string;
  to: string;
  style: ConnectionStyle;
  label?: string;
  fromEdge?: string;
  toEdge?: string;
  labelPosition?: number;
};

export type CompactFlowTitle = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CompactNotEditable = {
  id: string;
  type: string;
};

export type CompactCanvasState = {
  components: CompactComponent[];
  connections: CompactConnection[];
  flowTitles: CompactFlowTitle[];
  notEditable: CompactNotEditable[];
};

export type CreateComponentInput = {
  kind: string;
  label: string;
  x?: number;
  y?: number;
};

export type CreateConnectionInput = {
  from: string;
  to: string;
  style: string;
  label?: string;
  fromEdge?: string;
  toEdge?: string;
};

export type CreateFlowTitleInput = {
  label: string;
  x?: number;
  y?: number;
};

export type MoveShapeInput = {
  id: string;
  x: number;
  y: number;
};

export type RenameShapeInput = {
  id: string;
  label: string;
};

export type ZoomViewInput = {
  ids?: string[];
  zoom?: string;
};

export type CanvasAgentSession = {
  shouldRegisterTools(): boolean;
  armedProjectId(): string | null;
  syncArms(): Promise<void>;
  readCanvasState(): CompactCanvasState;
  createComponent(input: CreateComponentInput): CompactCanvasState;
  createConnection(input: CreateConnectionInput): CompactCanvasState;
  createFlowTitle(input: CreateFlowTitleInput): CompactCanvasState;
  moveShape(input: MoveShapeInput): CompactCanvasState;
  renameShape(input: RenameShapeInput): CompactCanvasState;
  deleteShape(id: string): CompactCanvasState;
  zoomView(input?: ZoomViewInput): CompactCanvasState;
};

type SessionDeps = {
  getProjectStatus: () => string | null;
  getEditor: () => CanvasAgentEditorPort | null;
  armBus: ArmBus;
  onAgentCursor?: (cursor: { x: number; y: number }) => void;
};

export function createCanvasAgentSession(
  deps: SessionDeps,
): CanvasAgentSession {
  return {
    shouldRegisterTools() {
      return (
        isReady(deps.getProjectStatus()) &&
        deps.armBus.hasClaim() &&
        isToolHost(deps.armBus)
      );
    },
    armedProjectId() {
      if (!deps.armBus.hasClaim()) {
        return null;
      }
      return (
        deps.armBus
          .listArmed()
          .find((claim) => claim.tabId === deps.armBus.tabId)?.projectId ?? null
      );
    },
    syncArms() {
      return deps.armBus.sync();
    },
    readCanvasState() {
      const editor = requireEditor(deps);
      return compactCanvasState(editor.getCurrentPageShapes());
    },
    createComponent(input) {
      const editor = requireWritableEditor(deps);
      const kind = parseComponentKind(input.kind);
      if (!kind) {
        throw new CanvasAgentError("unknown kind");
      }
      const position = resolveBoxPosition(
        editor.getCurrentPageShapes(),
        input.x,
        input.y,
      );
      const id = newShapeId();
      editor.createShape({
        id,
        type: "geo",
        x: position.x,
        y: position.y,
        w: BOX_WIDTH,
        h: BOX_HEIGHT,
        geo: "rectangle",
        color: KIND_COLORS[kind],
        fill: "solid",
        size: "m",
        label: input.label,
        generatedFrom: id,
      });
      return finishWrite(editor, id, deps);
    },
    createConnection(input) {
      const editor = requireWritableEditor(deps);
      const style = parseConnectionStyle(input.style);
      if (!style) {
        throw new CanvasAgentError("unknown style");
      }
      const shapes = editor.getCurrentPageShapes();
      const from = shapes.find((item) => item.id === input.from);
      const to = shapes.find((item) => item.id === input.to);
      if (!from || !to || !asComponent(from) || !asComponent(to)) {
        throw new CanvasAgentError("cannot create this shape");
      }
      spreadSameRowForLabel(editor, from, to, input.label ?? "");
      const laidOut = editor.getCurrentPageShapes();
      const fromBox = laidOut.find((item) => item.id === input.from) ?? from;
      const toBox = laidOut.find((item) => item.id === input.to) ?? to;
      const placement = pickConnectionPlacement(fromBox, toBox, laidOut, {
        fromEdge: input.fromEdge,
        toEdge: input.toEdge,
      });
      const id = newShapeId();
      editor.createShape({
        id,
        type: "arrow",
        x: fromBox.x,
        y: fromBox.y,
        dash: STYLE_DASH[style],
        label: input.label ?? "",
        fromShapeId: input.from,
        toShapeId: input.to,
        fromEdge: placement.fromEdge,
        toEdge: placement.toEdge,
        fromAlong: placement.along,
        toAlong: placement.along,
        labelPosition: placement.labelPosition,
      });
      return finishWrite(editor, id, deps);
    },
    createFlowTitle(input) {
      const editor = requireWritableEditor(deps);
      const size = titleSize(input.label);
      const position = resolveTitlePosition(
        editor.getCurrentPageShapes(),
        input.x,
        input.y,
        size,
      );
      const id = newShapeId();
      editor.createShape({
        id,
        type: "geo",
        x: position.x,
        y: position.y,
        w: size.w,
        h: size.h,
        geo: "rectangle",
        color: "grey",
        fill: "none",
        size: "l",
        label: input.label,
        generatedFrom: `flow:${id.slice("shape:".length)}`,
      });
      return finishWrite(editor, id, deps);
    },
    moveShape(input) {
      const editor = requireWritableEditor(deps);
      const shapes = editor.getCurrentPageShapes();
      requireEditableShape(shapes, input.id, "cannot move this shape");
      const current = shapes.find((item) => item.id === input.id);
      const others = shapes.filter((item) => item.id !== input.id);
      if (current && asComponent(current)) {
        const position = resolveBoxPosition(others, input.x, input.y);
        editor.updateShape(input.id, { x: position.x, y: position.y });
      } else if (current && asFlowTitle(current)) {
        const size = titleSize(current.label);
        const position = resolveTitlePosition(others, input.x, input.y, size);
        editor.updateShape(input.id, { x: position.x, y: position.y });
      } else {
        editor.updateShape(input.id, { x: input.x, y: input.y });
      }
      return finishWrite(editor, input.id, deps);
    },
    renameShape(input) {
      const editor = requireWritableEditor(deps);
      requireEditableShape(
        editor.getCurrentPageShapes(),
        input.id,
        "cannot rename this shape",
      );
      editor.updateShape(input.id, { label: input.label });
      return finishWrite(editor, input.id, deps);
    },
    deleteShape(id) {
      const editor = requireWritableEditor(deps);
      requireEditableShape(
        editor.getCurrentPageShapes(),
        id,
        "cannot delete this shape",
      );
      const bounds = editor.getShapeBounds(id);
      editor.deleteShape(id);
      editor.clampZoom(1);
      showAgentCursor(deps, bounds);
      return compactCanvasState(editor.getCurrentPageShapes());
    },
    zoomView(input = {}) {
      const editor = requireEditor(deps);
      if (input.zoom === "in") {
        editor.zoomIn();
        return compactCanvasState(editor.getCurrentPageShapes());
      }
      if (input.zoom === "out") {
        editor.zoomOut();
        return compactCanvasState(editor.getCurrentPageShapes());
      }
      if (input.zoom && input.zoom !== "fit") {
        throw new CanvasAgentError("unknown zoom");
      }
      const ids = input.ids?.length
        ? input.ids
        : editor.getCurrentPageShapes().map((item) => item.id);
      const bounds = unionBounds(
        ids.flatMap((id) => {
          const box = editor.getShapeBounds(id);
          return box ? [box] : [];
        }),
      );
      if (!bounds) {
        throw new CanvasAgentError("cannot zoom to this shape");
      }
      editor.zoomToBounds(bounds);
      return compactCanvasState(editor.getCurrentPageShapes());
    },
  };
}

function pickConnectionPlacement(
  from: CanvasAgentPageShape,
  to: CanvasAgentPageShape,
  shapes: CanvasAgentPageShape[],
  requested: { fromEdge?: string; toEdge?: string },
): {
  fromEdge: ConnectionEdge;
  toEdge: ConnectionEdge;
  along: number;
  labelPosition: number;
} {
  const pair = pairConnections(shapes, from.id, to.id);
  const isReverse = pair.some(
    (item) => item.from === to.id && item.to === from.id,
  );
  const usedFrom = isReverse
    ? new Set<ConnectionEdge>()
    : occupiedPairEdges(shapes, from.id, to.id);
  const usedTo = isReverse
    ? new Set<ConnectionEdge>()
    : occupiedPairEdges(shapes, to.id, from.id);
  const geometric = geometricEdges(from, to);
  const requestedFrom = parseRequestedEdge(requested.fromEdge);
  const requestedTo = parseRequestedEdge(requested.toEdge);
  const candidates: Array<{ fromEdge: ConnectionEdge; toEdge: ConnectionEdge }> =
    [];
  const obstacles = occupiedRects(
    shapes.filter((item) => item.id !== from.id && item.id !== to.id),
  );

  if (requestedFrom || requestedTo) {
    candidates.push({
      fromEdge: requestedFrom ?? geometric.fromEdge,
      toEdge: requestedTo ?? geometric.toEdge,
    });
  }
  candidates.push(geometric);
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

  const clear = (candidate: {
    fromEdge: ConnectionEdge;
    toEdge: ConnectionEdge;
  }) =>
    !corridorHits(from, to, candidate.fromEdge, candidate.toEdge, obstacles);

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
    along: pickAlong(shapes, from.id, edges.fromEdge, to.id, edges.toEdge),
    labelPosition: pickLabelPosition(
      shapes,
      from.id,
      edges.fromEdge,
      to.id,
      edges.toEdge,
    ),
  };
}

function parseRequestedEdge(value: string | undefined): ConnectionEdge | undefined {
  if (!value) {
    return undefined;
  }
  const edge = parseConnectionEdge(value);
  if (!edge) {
    throw new CanvasAgentError("unknown edge");
  }
  return edge;
}

function geometricEdges(
  from: CanvasAgentPageShape,
  to: CanvasAgentPageShape,
): { fromEdge: ConnectionEdge; toEdge: ConnectionEdge } {
  const fromCenterX = from.x + (from.w ?? BOX_WIDTH) / 2;
  const fromCenterY = from.y + (from.h ?? BOX_HEIGHT) / 2;
  const toCenterX = to.x + (to.w ?? BOX_WIDTH) / 2;
  const toCenterY = to.y + (to.h ?? BOX_HEIGHT) / 2;
  const deltaX = toCenterX - fromCenterX;
  const deltaY = toCenterY - fromCenterY;
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
  shapes: CanvasAgentPageShape[],
  shapeId: string,
  partnerId: string,
): Set<ConnectionEdge> {
  const used = new Set<ConnectionEdge>();
  for (const shape of shapes) {
    const connection = asConnection(shape);
    if (!connection) {
      continue;
    }
    const isPair =
      (connection.from === shapeId && connection.to === partnerId) ||
      (connection.from === partnerId && connection.to === shapeId);
    if (!isPair) {
      continue;
    }
    const fromShape = shapes.find((item) => item.id === connection.from);
    const toShape = shapes.find((item) => item.id === connection.to);
    if (!fromShape || !toShape) {
      continue;
    }
    const inferred = geometricEdges(fromShape, toShape);
    if (connection.from === shapeId) {
      used.add(parseConnectionEdge(connection.fromEdge ?? "") ?? inferred.fromEdge);
    }
    if (connection.to === shapeId) {
      used.add(parseConnectionEdge(connection.toEdge ?? "") ?? inferred.toEdge);
    }
  }
  return used;
}

function pairConnections(
  shapes: CanvasAgentPageShape[],
  fromId: string,
  toId: string,
): CompactConnection[] {
  return shapes.flatMap((item) => {
    const connection = asConnection(item);
    if (!connection) {
      return [];
    }
    if (
      (connection.from === fromId && connection.to === toId) ||
      (connection.from === toId && connection.to === fromId)
    ) {
      return [connection];
    }
    return [];
  });
}

const LABEL_SLOTS = [0.28, 0.72, 0.45, 0.38, 0.62];
const ALONG_SLOTS = [0.5, 0.34, 0.66, 0.22, 0.78];
const CORRIDOR_OUT = 48;

function pickLabelPosition(
  shapes: CanvasAgentPageShape[],
  fromId: string,
  fromEdge: ConnectionEdge,
  toId: string,
  toEdge: ConnectionEdge,
): number {
  const pair = pairConnections(shapes, fromId, toId);
  const used = pair.map((item) => item.labelPosition ?? 0.5);
  for (const shape of shapes) {
    const connection = asConnection(shape);
    if (!connection) {
      continue;
    }
    if (pair.some((item) => item.id === connection.id)) {
      continue;
    }
    const connectionFrom = parseConnectionEdge(connection.fromEdge ?? "");
    const connectionTo = parseConnectionEdge(connection.toEdge ?? "");
    const sharesEdge =
      (connection.from === fromId && connectionFrom === fromEdge) ||
      (connection.to === fromId && connectionTo === fromEdge) ||
      (connection.from === toId && connectionFrom === toEdge) ||
      (connection.to === toId && connectionTo === toEdge);
    if (sharesEdge) {
      used.push(connection.labelPosition ?? 0.5);
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
  box: CanvasAgentPageShape,
  edge: ConnectionEdge,
  along: number,
): { x: number; y: number } {
  const w = box.w ?? BOX_WIDTH;
  const h = box.h ?? BOX_HEIGHT;
  if (edge === "left") {
    return { x: box.x, y: box.y + h * along };
  }
  if (edge === "right") {
    return { x: box.x + w, y: box.y + h * along };
  }
  if (edge === "top") {
    return { x: box.x + w * along, y: box.y };
  }
  return { x: box.x + w * along, y: box.y + h };
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
  from: CanvasAgentPageShape,
  to: CanvasAgentPageShape,
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
  shapes: CanvasAgentPageShape[],
  fromId: string,
  fromEdge: ConnectionEdge,
  toId: string,
  toEdge: ConnectionEdge,
): number {
  const used: number[] = [];
  for (const shape of shapes) {
    const connection = asConnection(shape);
    if (!connection) {
      continue;
    }
    const inferredFrom = parseConnectionEdge(connection.fromEdge ?? "");
    const inferredTo = parseConnectionEdge(connection.toEdge ?? "");
    if (connection.from === fromId && inferredFrom === fromEdge) {
      used.push(shape.fromAlong ?? 0.5);
    }
    if (connection.to === fromId && inferredTo === fromEdge) {
      used.push(shape.toAlong ?? 0.5);
    }
    if (connection.from === toId && inferredFrom === toEdge) {
      used.push(shape.fromAlong ?? 0.5);
    }
    if (connection.to === toId && inferredTo === toEdge) {
      used.push(shape.toAlong ?? 0.5);
    }
  }
  for (const slot of ALONG_SLOTS) {
    if (used.every((value) => Math.abs(value - slot) > 0.1)) {
      return slot;
    }
  }
  return 0.5;
}

function unionBounds(boxes: ShapeBounds[]): ShapeBounds | null {
  const first = boxes[0];
  if (!first) {
    return null;
  }
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.w;
  let maxY = first.y + first.h;
  for (const box of boxes.slice(1)) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function requireEditor(deps: SessionDeps): CanvasAgentEditorPort {
  assertExclusiveActiveProject(deps.armBus);
  const editor = deps.getEditor();
  if (!isReady(deps.getProjectStatus()) || !editor) {
    throw new CanvasAgentError("not ready");
  }
  if (!deps.armBus.hasClaim()) {
    throw new CanvasAgentError("not allowed");
  }
  return editor;
}

function requireWritableEditor(deps: SessionDeps): CanvasAgentEditorPort {
  const editor = requireEditor(deps);
  if (!editor.isWritable()) {
    throw new CanvasAgentError("read-only");
  }
  return editor;
}

function finishWrite(
  editor: CanvasAgentEditorPort,
  id: string,
  deps: SessionDeps,
): CompactCanvasState {
  editor.clampZoom(1);
  showAgentCursor(deps, editor.getShapeBounds(id));
  return compactCanvasState(editor.getCurrentPageShapes());
}

function showAgentCursor(
  deps: SessionDeps | undefined,
  bounds: ShapeBounds | null,
): void {
  if (!bounds) {
    return;
  }
  deps?.onAgentCursor?.({
    x: bounds.x + bounds.w / 2,
    y: bounds.y + bounds.h / 2,
  });
}

function requireEditableShape(
  shapes: CanvasAgentPageShape[],
  id: string,
  message: string,
): void {
  const found = shapes.find((item) => item.id === id);
  if (!found || !isEditableShape(found)) {
    throw new CanvasAgentError(message);
  }
}

function isEditableShape(shape: CanvasAgentPageShape): boolean {
  return Boolean(asFlowTitle(shape) || asComponent(shape) || asConnection(shape));
}

type Rect = { x: number; y: number; w: number; h: number };

function resolveBoxPosition(
  shapes: CanvasAgentPageShape[],
  x: number | undefined,
  y: number | undefined,
): { x: number; y: number } {
  const occupied = occupiedRects(shapes);
  if (x !== undefined && y !== undefined) {
    const requested = { x, y, w: BOX_WIDTH, h: BOX_HEIGHT };
    if (!collides(requested, occupied)) {
      return { x, y };
    }
  }

  const titles = shapes.filter((item) => asFlowTitle(item));
  const latestTitle = titles.at(-1);
  if (latestTitle) {
    const under = {
      x: latestTitle.x,
      y: latestTitle.y + (latestTitle.h ?? TITLE_HEIGHT) + TITLE_GAP,
      w: BOX_WIDTH,
      h: BOX_HEIGHT,
    };
    if (!collides(under, occupied)) {
      return { x: under.x, y: under.y };
    }
  }

  const components = shapes.flatMap((item) => {
    const component = asComponent(item);
    return component ? [component] : [];
  });
  if (components.length === 0) {
    return { x: x ?? CANVAS_PADDING, y: y ?? CANVAS_PADDING };
  }

  const lowestY = Math.max(...components.map((item) => item.y));
  const row = components.filter(
    (item) => Math.abs(item.y - lowestY) < BOX_HEIGHT / 2,
  );
  const rightmost = row.reduce((best, item) =>
    item.x >= best.x ? item : best,
  );
  const toRight = {
    x: rightmost.x + BOX_WIDTH + BOX_GAP,
    y: rightmost.y,
    w: BOX_WIDTH,
    h: BOX_HEIGHT,
  };
  if (!collides(toRight, occupied)) {
    return { x: toRight.x, y: toRight.y };
  }

  const bottom = Math.max(...occupied.map((item) => item.y + item.h));
  return { x: CANVAS_PADDING, y: bottom + FLOW_GAP };
}

function titleSize(label: string): { w: number; h: number } {
  const needed = Math.max(BOX_WIDTH, label.trim().length * TITLE_CHAR_WIDTH + 72);
  const w = Math.min(TITLE_MAX_WIDTH, needed);
  const lines = Math.max(1, Math.ceil(needed / w));
  return {
    w,
    h: Math.max(TITLE_HEIGHT, lines * TITLE_LINE_HEIGHT + 16),
  };
}

function resolveTitlePosition(
  shapes: CanvasAgentPageShape[],
  x: number | undefined,
  y: number | undefined,
  size: { w: number; h: number },
): { x: number; y: number } {
  const occupied = occupiedRects(shapes);
  if (x !== undefined && y !== undefined) {
    const requested = { x, y, w: size.w, h: size.h };
    if (!collides(requested, occupied)) {
      return { x, y };
    }
    const hit = occupied.find((item) => tooClose(requested, item));
    if (hit) {
      return {
        x: hit.x,
        y: hit.y - size.h - TITLE_GAP,
      };
    }
  }

  if (occupied.length === 0) {
    return { x: CANVAS_PADDING, y: 40 };
  }

  const bottom = Math.max(...occupied.map((item) => item.y + item.h));
  return { x: CANVAS_PADDING, y: bottom + FLOW_GAP };
}

function occupiedRects(shapes: CanvasAgentPageShape[]): Rect[] {
  const rects: Rect[] = [];
  for (const shape of shapes) {
    if (asFlowTitle(shape)) {
      rects.push({
        x: shape.x,
        y: shape.y,
        w: shape.w ?? BOX_WIDTH,
        h: shape.h ?? TITLE_HEIGHT,
      });
      continue;
    }
    const component = asComponent(shape);
    if (component) {
      rects.push({
        x: component.x,
        y: component.y,
        w: component.w,
        h: component.h,
      });
    }
  }
  return rects;
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
  const hClear =
    a.x >= b.x + b.w ? a.x - (b.x + b.w) : b.x - (a.x + a.w);
  const vClear =
    a.y >= b.y + b.h ? a.y - (b.y + b.h) : b.y - (a.y + a.h);
  if (vOverlap && hClear < BOX_GAP) {
    return true;
  }
  if (hOverlap && vClear < TITLE_GAP) {
    return true;
  }
  return false;
}

function spreadSameRowForLabel(
  editor: CanvasAgentEditorPort,
  from: CanvasAgentPageShape,
  to: CanvasAgentPageShape,
  label: string,
): void {
  const fromBox = asComponent(from);
  const toBox = asComponent(to);
  if (!fromBox || !toBox) {
    return;
  }
  const needed = Math.max(BOX_GAP, 64 + label.length * 9);
  const left = fromBox.x <= toBox.x ? fromBox : toBox;
  const right = fromBox.x <= toBox.x ? toBox : fromBox;
  const vOverlap =
    left.y < right.y + right.h && left.y + left.h > right.y;
  if (!vOverlap) {
    return;
  }
  const gap = right.x - (left.x + left.w);
  if (gap >= needed) {
    return;
  }
  const dx = needed - gap;
  for (const shape of editor.getCurrentPageShapes()) {
    const component = asComponent(shape);
    if (!component) {
      continue;
    }
    if (
      Math.abs(component.y - right.y) < BOX_HEIGHT / 2 &&
      component.x >= right.x
    ) {
      editor.updateShape(component.id, { x: component.x + dx });
    }
  }
}

function newShapeId(): string {
  return `shape:${crypto.randomUUID()}`;
}

function assertExclusiveActiveProject(armBus: ArmBus): void {
  const armed = armBus.listArmed();
  if (armed.length < 2) {
    return;
  }
  throw new CanvasAgentError(dualActiveProjectMessage(armed));
}

function isToolHost(armBus: ArmBus): boolean {
  const armed = armBus.listArmed();
  if (armed.length <= 1) {
    return true;
  }
  const host = [...armed].sort((left, right) =>
    left.tabId.localeCompare(right.tabId),
  )[0];
  return host?.tabId === armBus.tabId;
}

function dualActiveProjectMessage(armed: ArmedProject[]): string {
  const names = [...new Set(armed.map((claim) => claim.projectName))]
    .map((name) => `"${name}"`)
    .join(" and ");
  return `Two windows have agents allowed (${names}). Turn off Allow agent in one window, then try again.`;
}

function isReady(status: string | null): boolean {
  return status === "ready";
}

function compactCanvasState(shapes: CanvasAgentPageShape[]): CompactCanvasState {
  const components: CompactComponent[] = [];
  const connections: CompactConnection[] = [];
  const flowTitles: CompactFlowTitle[] = [];
  const notEditable: CompactNotEditable[] = [];

  for (const shape of shapes) {
    const flowTitle = asFlowTitle(shape);
    if (flowTitle) {
      flowTitles.push(flowTitle);
      continue;
    }

    const component = asComponent(shape);
    if (component) {
      components.push(component);
      continue;
    }

    const connection = asConnection(shape);
    if (connection) {
      connections.push(connection);
      continue;
    }

    notEditable.push({ id: shape.id, type: shape.type });
  }

  return { components, connections, flowTitles, notEditable };
}

function asFlowTitle(shape: CanvasAgentPageShape): CompactFlowTitle | null {
  if (shape.type !== "geo") {
    return null;
  }
  if (shape.geo && shape.geo !== "rectangle") {
    return null;
  }
  const fromGenerate = shape.generatedFrom?.startsWith("flow:") === true;
  const looksLikeTitle =
    shape.fill === "none" && shape.color === "grey" && shape.size === "l";
  if (!fromGenerate && !looksLikeTitle) {
    return null;
  }
  return {
    id: shape.id,
    label: shape.label,
    x: shape.x,
    y: shape.y,
    w: shape.w ?? BOX_WIDTH,
    h: shape.h ?? TITLE_HEIGHT,
  };
}

function asComponent(shape: CanvasAgentPageShape): CompactComponent | null {
  if (shape.type !== "geo") {
    return null;
  }
  if (shape.geo && shape.geo !== "rectangle") {
    return null;
  }
  if (shape.fill === "none") {
    return null;
  }
  const kind = kindFromColor(shape.color);
  if (!kind) {
    return null;
  }
  return {
    id: shape.id,
    label: shape.label,
    kind,
    x: shape.x,
    y: shape.y,
    w: shape.w ?? BOX_WIDTH,
    h: shape.h ?? BOX_HEIGHT,
  };
}

function asConnection(shape: CanvasAgentPageShape): CompactConnection | null {
  if (shape.type !== "arrow") {
    return null;
  }
  if (!shape.fromShapeId || !shape.toShapeId) {
    return null;
  }
  const style = styleFromDash(shape.dash);
  if (!style) {
    return null;
  }
  const connection: CompactConnection = {
    id: shape.id,
    from: shape.fromShapeId,
    to: shape.toShapeId,
    style,
  };
  if (shape.label.trim()) {
    connection.label = shape.label;
  }
  if (shape.fromEdge) {
    connection.fromEdge = shape.fromEdge;
  }
  if (shape.toEdge) {
    connection.toEdge = shape.toEdge;
  }
  if (shape.labelPosition !== undefined) {
    connection.labelPosition = shape.labelPosition;
  }
  return connection;
}
