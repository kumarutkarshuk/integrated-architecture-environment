import { CANVAS_PAGE_ID } from "../canvas/records.js";
import { layoutDiagramComponents } from "./diagram-layout.js";
import type { DiagramConnection, DiagramPlan } from "./diagram-plan.js";
import type { GenerateResult } from "./types.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 100;

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
      color: "black",
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
      meta: { generatedFrom: component.id },
    });
  });

  plan.connections.forEach((connection, index) => {
    const arrowRecords = buildConnectionRecords(
      connection,
      layout,
      toShapeIndex(plan.components.length + index),
    );

    Object.assign(records, arrowRecords);
  });

  return { records };
}

function buildConnectionRecords(
  connection: DiagramConnection,
  layout: Map<string, { x: number; y: number; w: number; h: number }>,
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
  const anchors = resolveConnectionAnchors(from, to);

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
        dash: "draw",
        size: "m",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        font: "draw",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
        bend: 0,
        richText: toRichText(connection.label ?? ""),
        labelPosition: 0.5,
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
  from: { x: number; y: number; w: number; h: number },
  to: { x: number; y: number; w: number; h: number },
): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const fromCenterX = from.x + from.w / 2;
  const fromCenterY = from.y + from.h / 2;
  const toCenterX = to.x + to.w / 2;
  const toCenterY = to.y + to.h / 2;
  const deltaX = toCenterX - fromCenterX;
  const deltaY = toCenterY - fromCenterY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX >= 0) {
      return {
        start: { x: 1, y: 0.5 },
        end: { x: 0, y: 0.5 },
      };
    }

    return {
      start: { x: 0, y: 0.5 },
      end: { x: 1, y: 0.5 },
    };
  }

  if (deltaY >= 0) {
    return {
      start: { x: 0.5, y: 1 },
      end: { x: 0.5, y: 0 },
    };
  }

  return {
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  };
}

function toShapeIndex(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const first = alphabet[Math.floor(index / alphabet.length) % alphabet.length];
  const second = alphabet[index % alphabet.length];
  return `${first}${second}`;
}
