import { CANVAS_PAGE_ID } from "../canvas/records.js";
import {
  anchorFromEdge,
  placeDiagramConnections,
  type PlacedConnection,
} from "./diagram-connections.js";
import { layoutDiagramPlan, type FlowLayout } from "./diagram-layout.js";
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

    const placements = placeDiagramConnections(layout.boxes, flow.connections);
    flow.connections.forEach((connection, connectionIndex) => {
      const placement = placements[connectionIndex];
      if (!placement) {
        return;
      }
      const arrowRecords = buildConnectionRecords(
        flow,
        connection,
        placement,
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
  placement: PlacedConnection,
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
  const start = anchorFromEdge(placement.fromEdge, placement.along);
  const end = anchorFromEdge(placement.toEdge, placement.along);

  return {
    [arrowId]: {
      id: arrowId,
      typeName: "shape",
      type: "arrow",
      x: from.x,
      y: from.y,
      rotation: 0,
      index,
      parentId: CANVAS_PAGE_ID,
      isLocked: false,
      opacity: 1,
      props: {
        kind: "elbow",
        labelColor: "black",
        color: "black",
        fill: "semi",
        dash: STYLE_DASH[connection.style],
        size: "s",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        font: "draw",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
        bend: 0,
        richText: toRichText(connection.label ?? ""),
        labelPosition: placement.labelPosition,
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
        normalizedAnchor: start,
        isExact: false,
        isPrecise: true,
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
        normalizedAnchor: end,
        isExact: false,
        isPrecise: true,
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

function toShapeIndex(index: number): string {
  const digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const n = index + 1;
  if (n < digits.length) {
    return `a${digits[n]}`;
  }

  const rest = n - digits.length;
  const high = Math.floor(rest / digits.length);
  const low = rest % digits.length;
  if (high >= digits.length) {
    throw new Error("Diagram has too many shapes to index");
  }
  return `b${digits[high]}${digits[low]}`;
}
