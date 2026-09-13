import {
  renderPlaintextFromRichText,
  type Editor,
  type TLRichText,
  type TLShape,
} from "tldraw";
import type {
  CanvasAgentEditorPort,
  CanvasAgentPageShape,
} from "./session";

type ShapeProps = {
  geo?: string;
  color?: string;
  fill?: string;
  dash?: string;
  size?: string;
  text?: string;
  richText?: TLRichText;
};

export function createTldrawEditorPort(
  editor: Editor,
): CanvasAgentEditorPort {
  return {
    getCurrentPageShapes() {
      return editor.getCurrentPageShapes().map((shape) => toPageShape(editor, shape));
    },
  };
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
