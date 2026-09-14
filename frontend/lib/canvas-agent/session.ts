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
const TITLE_HEIGHT = 56;
const TITLE_GAP = 16;
const BOX_GAP = 40;
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
};

export type CompactComponent = {
  id: string;
  label: string;
  kind: ComponentKind;
  x: number;
  y: number;
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
};

export function createCanvasAgentSession(
  deps: SessionDeps,
): CanvasAgentSession {
  return {
    shouldRegisterTools() {
      return isReady(deps.getProjectStatus()) && deps.armBus.hasClaim();
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
      return finishWrite(editor, id);
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
      const placement = pickConnectionPlacement(from, to, shapes, {
        fromEdge: input.fromEdge,
        toEdge: input.toEdge,
      });
      const id = newShapeId();
      editor.createShape({
        id,
        type: "arrow",
        x: from.x,
        y: from.y,
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
      return finishWrite(editor, id);
    },
    createFlowTitle(input) {
      const editor = requireWritableEditor(deps);
      const position = resolveTitlePosition(
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
        h: TITLE_HEIGHT,
        geo: "rectangle",
        color: "grey",
        fill: "none",
        size: "l",
        label: input.label,
        generatedFrom: `flow:${id.slice("shape:".length)}`,
      });
      return finishWrite(editor, id);
    },
    moveShape(input) {
      const editor = requireWritableEditor(deps);
      requireEditableShape(
        editor.getCurrentPageShapes(),
        input.id,
        "cannot move this shape",
      );
      editor.updateShape(input.id, { x: input.x, y: input.y });
      return finishWrite(editor, input.id);
    },
    renameShape(input) {
      const editor = requireWritableEditor(deps);
      requireEditableShape(
        editor.getCurrentPageShapes(),
        input.id,
        "cannot rename this shape",
      );
      editor.updateShape(input.id, { label: input.label });
      return finishWrite(editor, input.id);
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
      if (bounds) {
        editor.zoomToBounds(bounds);
      }
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
  const usedFrom = occupiedEdgesOnShape(shapes, from.id, isReverse ? to.id : undefined);
  const usedTo = occupiedEdgesOnShape(shapes, to.id, isReverse ? from.id : undefined);
  const geometric = geometricEdges(from, to);
  const requestedFrom = parseRequestedEdge(requested.fromEdge);
  const requestedTo = parseRequestedEdge(requested.toEdge);
  const candidates: Array<{ fromEdge: ConnectionEdge; toEdge: ConnectionEdge }> =
    [];

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

  let edges = geometric;
  for (const candidate of candidates) {
    if (
      !usedFrom.has(candidate.fromEdge) &&
      !usedTo.has(candidate.toEdge)
    ) {
      edges = candidate;
      break;
    }
  }

  return {
    ...edges,
    along: pickAlong(shapes, from.id, edges.fromEdge, to.id, edges.toEdge),
    labelPosition: pickLabelPosition(pair),
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

function occupiedEdgesOnShape(
  shapes: CanvasAgentPageShape[],
  shapeId: string,
  ignorePartnerId?: string,
): Set<ConnectionEdge> {
  const used = new Set<ConnectionEdge>();
  for (const shape of shapes) {
    const connection = asConnection(shape);
    if (!connection) {
      continue;
    }
    if (
      ignorePartnerId &&
      ((connection.from === shapeId && connection.to === ignorePartnerId) ||
        (connection.from === ignorePartnerId && connection.to === shapeId))
    ) {
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

function pickLabelPosition(pair: CompactConnection[]): number {
  const used = pair.map((item) => item.labelPosition ?? 0.5);
  for (const slot of LABEL_SLOTS) {
    if (used.every((value) => Math.abs(value - slot) > 0.08)) {
      return slot;
    }
  }
  return LABEL_SLOTS[pair.length % LABEL_SLOTS.length] ?? 0.28;
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
): CompactCanvasState {
  const bounds = editor.getShapeBounds(id);
  if (bounds) {
    editor.zoomToBounds(bounds);
  }
  return compactCanvasState(editor.getCurrentPageShapes());
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

function resolveBoxPosition(
  shapes: CanvasAgentPageShape[],
  x: number | undefined,
  y: number | undefined,
): { x: number; y: number } {
  if (x !== undefined && y !== undefined) {
    return { x, y };
  }
  const components = shapes.flatMap((item) => {
    const component = asComponent(item);
    return component ? [component] : [];
  });
  if (components.length === 0) {
    return { x: x ?? CANVAS_PADDING, y: y ?? CANVAS_PADDING };
  }
  const rightmost = components.reduce((best, item) =>
    item.x >= best.x ? item : best,
  );
  return {
    x: x ?? rightmost.x + BOX_WIDTH + BOX_GAP,
    y: y ?? rightmost.y,
  };
}

function resolveTitlePosition(
  shapes: CanvasAgentPageShape[],
  x: number | undefined,
  y: number | undefined,
): { x: number; y: number } {
  if (x !== undefined && y !== undefined) {
    return { x, y };
  }
  const titles = shapes.filter((item) => asFlowTitle(item));
  if (titles.length > 0) {
    const rightmost = titles.reduce((best, item) =>
      item.x >= best.x ? item : best,
    );
    return {
      x: x ?? rightmost.x + BOX_WIDTH + BOX_GAP,
      y: y ?? rightmost.y,
    };
  }
  const components = shapes.flatMap((item) => {
    const component = asComponent(item);
    return component ? [component] : [];
  });
  if (components.length === 0) {
    return { x: x ?? CANVAS_PADDING, y: y ?? 40 };
  }
  const minY = Math.min(...components.map((item) => item.y));
  return {
    x: x ?? CANVAS_PADDING,
    y: y ?? minY - TITLE_HEIGHT - TITLE_GAP,
  };
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

function dualActiveProjectMessage(armed: ArmedProject[]): string {
  const names = armed.map((claim) => `"${claim.projectName}"`).join(" and ");
  return `${names} are both Active Projects.`;
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
  return { id: shape.id, label: shape.label };
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
