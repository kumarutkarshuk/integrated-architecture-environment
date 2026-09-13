import {
  kindFromColor,
  styleFromDash,
  type ComponentKind,
  type ConnectionStyle,
} from "./kinds";

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
  geo?: string;
  color?: string;
  fill?: string;
  dash?: string;
  size?: string;
  label: string;
  generatedFrom?: string;
  fromShapeId?: string;
  toShapeId?: string;
};

export type CanvasAgentEditorPort = {
  getCurrentPageShapes(): CanvasAgentPageShape[];
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

export type CanvasAgentSession = {
  shouldRegisterTools(): boolean;
  readCanvasState(): CompactCanvasState;
};

export function createCanvasAgentSession(deps: {
  getProjectStatus: () => string | null;
  isAllowed: () => boolean;
  getEditor: () => CanvasAgentEditorPort | null;
}): CanvasAgentSession {
  return {
    shouldRegisterTools() {
      return isReady(deps.getProjectStatus()) && deps.isAllowed();
    },
    readCanvasState() {
      const editor = deps.getEditor();
      if (!isReady(deps.getProjectStatus()) || !editor) {
        throw new CanvasAgentError("not ready");
      }
      if (!deps.isAllowed()) {
        throw new CanvasAgentError("not allowed");
      }

      return compactCanvasState(editor.getCurrentPageShapes());
    },
  };
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
  return connection;
}
