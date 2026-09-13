import {
  createBindingId,
  renderPlaintextFromRichText,
  toRichText,
  type Editor,
  type TLRichText,
  type TLShape,
  type TLShapeId,
  type TLShapePartial,
} from "tldraw";
import type {
  CanvasAgentEditorPort,
  CanvasAgentPageShape,
} from "./session";
import { KIND_COLORS } from "./kinds";

type ShapeProps = {
  geo?: string;
  color?: string;
  fill?: string;
  dash?: string;
  size?: string;
  text?: string;
  richText?: TLRichText;
};

const BOX_WIDTH = 220;
const BOX_HEIGHT = 100;

export function createTldrawEditorPort(
  editor: Editor,
): CanvasAgentEditorPort {
  return {
    getCurrentPageShapes() {
      return editor.getCurrentPageShapes().map((shape) => toPageShape(editor, shape));
    },
    isWritable() {
      return !editor.getIsReadonly();
    },
    getShapeBounds(id) {
      const bounds = editor.getShapePageBounds(id as TLShapeId);
      if (!bounds) {
        return null;
      }
      return { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
    },
    createShape(shape) {
      editor.markHistoryStoppingPoint("canvas-agent");
      if (shape.type === "arrow") {
        createArrow(editor, shape);
        return;
      }
      editor.createShape({
        id: shape.id as TLShapeId,
        type: "geo",
        parentId: editor.getCurrentPageId(),
        x: shape.x,
        y: shape.y,
        props: {
          geo: "rectangle",
          dash: "solid",
          w: shape.w ?? BOX_WIDTH,
          h: shape.h ?? BOX_HEIGHT,
          color: geoColor(shape.color),
          fill: shape.fill === "none" ? "none" : "solid",
          size: shape.size === "l" ? "l" : "m",
          font: "draw",
          align: shape.fill === "none" ? "start" : "middle",
          verticalAlign: "middle",
          labelColor: "black",
          richText: toRichText(shape.label),
        },
        meta: shape.generatedFrom
          ? { generatedFrom: shape.generatedFrom }
          : {},
      });
    },
    updateShape(id, patch) {
      const existing = editor.getShape(id as TLShapeId);
      if (!existing) {
        return;
      }
      editor.markHistoryStoppingPoint("canvas-agent");
      const partial: TLShapePartial = {
        id: existing.id,
        type: existing.type,
        x: patch.x,
        y: patch.y,
      };
      if (patch.label !== undefined) {
        partial.props = { richText: toRichText(patch.label) };
      }
      editor.updateShape(partial);
    },
    deleteShape(id) {
      editor.markHistoryStoppingPoint("canvas-agent");
      editor.deleteShape(id as TLShapeId);
    },
    zoomToBounds(bounds) {
      editor.run(
        () => {
          editor.zoomToBounds(bounds, {
            animation: { duration: 0 },
            inset: 72,
          });
        },
        { history: "ignore" },
      );
    },
  };
}

function createArrow(editor: Editor, shape: CanvasAgentPageShape): void {
  const id = shape.id as TLShapeId;
  editor.createShape({
    id,
    type: "arrow",
    parentId: editor.getCurrentPageId(),
    x: shape.x,
    y: shape.y,
    props: {
      kind: "elbow",
      labelColor: "black",
      color: "black",
      fill: "none",
      dash: arrowDash(shape.dash),
      size: "s",
      arrowheadStart: "none",
      arrowheadEnd: "arrow",
      font: "draw",
      richText: toRichText(shape.label),
    },
    meta: shape.generatedFrom ? { generatedFrom: shape.generatedFrom } : {},
  });
  if (shape.fromShapeId) {
    bindArrowEnd(editor, id, shape.fromShapeId, "start", { x: 1, y: 0.5 });
  }
  if (shape.toShapeId) {
    bindArrowEnd(editor, id, shape.toShapeId, "end", { x: 0, y: 0.5 });
  }
}

function bindArrowEnd(
  editor: Editor,
  arrowId: TLShapeId,
  toId: string,
  terminal: "end" | "start",
  normalizedAnchor: { x: number; y: number },
): void {
  editor.createBinding({
    id: createBindingId(),
    type: "arrow",
    fromId: arrowId,
    toId: toId as TLShapeId,
    props: {
      terminal,
      normalizedAnchor,
      isExact: false,
      isPrecise: false,
      snap: "edge",
    },
  });
}

function geoColor(
  color: string | undefined,
): "black" | "grey" | "blue" | "violet" | "green" | "orange" | "yellow" {
  if (color && Object.values(KIND_COLORS).includes(color)) {
    return color as "grey" | "blue" | "violet" | "green" | "orange" | "yellow";
  }
  return "black";
}

function arrowDash(dash: string | undefined): "solid" | "dashed" | "dotted" {
  if (dash === "dashed" || dash === "dotted") {
    return dash;
  }
  return "solid";
}

function toPageShape(editor: Editor, shape: TLShape): CanvasAgentPageShape {
  const props = shape.props as ShapeProps;
  const meta = shape.meta as { generatedFrom?: unknown };
  const generatedFrom =
    typeof meta?.generatedFrom === "string" ? meta.generatedFrom : undefined;
  const bindings =
    shape.type === "arrow"
      ? editor.getBindingsFromShape(shape.id, "arrow")
      : [];
  const fromShapeId = bindings.find((binding) => binding.props.terminal === "start")
    ?.toId;
  const toShapeId = bindings.find((binding) => binding.props.terminal === "end")
    ?.toId;

  return {
    id: shape.id,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    geo: props.geo,
    color: props.color,
    fill: props.fill,
    dash: props.dash,
    size: props.size,
    label: shapeLabel(editor, props),
    generatedFrom,
    fromShapeId,
    toShapeId,
  };
}

function shapeLabel(editor: Editor, props: ShapeProps): string {
  if (typeof props.text === "string" && props.text.trim()) {
    return props.text;
  }
  if (props.richText) {
    return renderPlaintextFromRichText(editor, props.richText).trim();
  }
  return "";
}
