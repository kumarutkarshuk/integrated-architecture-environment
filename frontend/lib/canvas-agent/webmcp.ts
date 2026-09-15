import type { CanvasAgentSession, CompactCanvasState } from "./session";

const EMBED_SRC =
  "https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@latest/dist/browser/embed.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

type ModelContext = {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      execute: (input?: Record<string, unknown>) => Promise<ToolResult>;
    },
    options?: { signal?: AbortSignal },
  ): Promise<void>;
};

export function mountWebMcpRelayEmbed(): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  const existing = document.querySelector(
    "script[data-iae-webmcp-embed]",
  ) as HTMLScriptElement | null;
  if (existing) {
    if (existing.dataset.loaded === "true" || existing.dataset.error === "true") {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = EMBED_SRC;
    script.async = true;
    script.dataset.iaeWebmcpEmbed = "";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.dataset.error = "true";
        resolve();
      },
      { once: true },
    );
    document.body.appendChild(script);
  });
}

export async function registerCanvasAgentTools(
  session: CanvasAgentSession,
  signal: AbortSignal,
): Promise<void> {
  const modelContext = await getModelContext();
  if (!modelContext || signal.aborted) {
    return;
  }

  await registerTool(modelContext, session, signal, {
    name: "read_canvas_state",
    description:
      "Read a compact live view of this tab's Canvas State: kind boxes with x/y/w/h, arrows, Flow titles with x/y/w/h, and other shapes that cannot be edited. If two windows have agents allowed, this fails and tells you to turn Allow agent off in one window.",
    inputSchema: { type: "object", properties: {} },
    run: () => session.readCanvasState(),
  });

  await registerTool(modelContext, session, signal, {
    name: "create_component",
    description:
      "Add a labeled kind box (client, service, store, queue, storage, external) with generate colors. Omit x/y unless you already read live positions. Overlapping x/y are ignored; the box is placed under the latest Flow title or to the right with room for arrow labels. Does not move the camera.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string" },
        label: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["kind", "label"],
    },
    run: (input) =>
      session.createComponent({
        kind: stringArg(input, "kind"),
        label: stringArg(input, "label"),
        x: numberArg(input, "x"),
        y: numberArg(input, "y"),
      }),
  });

  await registerTool(modelContext, session, signal, {
    name: "create_connection",
    description:
      "Add a connection between two kind boxes. Style is sync (solid), async (dashed), or data (dotted). Optional short label. Optional fromEdge and toEdge are left, right, top, or bottom. Busy sides are skipped. A path that would cut through another box is routed around it. Labels on the same box edge are offset so they do not stack. Does not move the camera.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        style: { type: "string" },
        label: { type: "string" },
        fromEdge: { type: "string" },
        toEdge: { type: "string" },
      },
      required: ["from", "to", "style"],
    },
    run: (input) =>
      session.createConnection({
        from: stringArg(input, "from"),
        to: stringArg(input, "to"),
        style: stringArg(input, "style"),
        label: optionalStringArg(input, "label"),
        fromEdge: optionalStringArg(input, "fromEdge"),
        toEdge: optionalStringArg(input, "toEdge"),
      }),
  });

  await registerTool(modelContext, session, signal, {
    name: "create_flow_title",
    description:
      "Add a Flow title the same way generate does (labeled geo title, not a tldraw frame). Long labels get a wider box so the text stays off the kind boxes below. Omit x/y to stack a new flow below existing content. Overlapping x/y are nudged off boxes. Does not move the camera.",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["label"],
    },
    run: (input) =>
      session.createFlowTitle({
        label: stringArg(input, "label"),
        x: numberArg(input, "x"),
        y: numberArg(input, "y"),
      }),
  });

  await registerTool(modelContext, session, signal, {
    name: "move_shape",
    description:
      "Move a kind box, styled arrow, or Flow title on this tab. Other shape types are refused.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["id", "x", "y"],
    },
    run: (input) =>
      session.moveShape({
        id: stringArg(input, "id"),
        x: numberArg(input, "x") ?? 0,
        y: numberArg(input, "y") ?? 0,
      }),
  });

  await registerTool(modelContext, session, signal, {
    name: "rename_shape",
    description:
      "Rename a kind box, styled arrow, or Flow title on this tab. Other shape types are refused.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        label: { type: "string" },
      },
      required: ["id", "label"],
    },
    run: (input) =>
      session.renameShape({
        id: stringArg(input, "id"),
        label: stringArg(input, "label"),
      }),
  });

  await registerTool(modelContext, session, signal, {
    name: "delete_shape",
    description:
      "Delete a kind box, styled arrow, or Flow title on this tab. Freehand, images, and extra geo are refused.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
    run: (input) => session.deleteShape(stringArg(input, "id")),
  });

  await registerTool(modelContext, session, signal, {
    name: "zoom_view",
    description:
      "Move this tab's camera so the User can see the work. Pass ids to frame those shapes, zoom in or out, or zoom fit for the whole page. Fit never goes past 100% zoom. Writes do not move the camera; call this only when the User should look. Does not change selection.",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "string" } },
        zoom: { type: "string" },
      },
    },
    run: (input) =>
      session.zoomView({
        ids: stringArrayArg(input, "ids"),
        zoom: optionalStringArg(input, "zoom"),
      }),
  });
}

async function registerTool(
  modelContext: ModelContext,
  session: CanvasAgentSession,
  signal: AbortSignal,
  tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    run: (input?: Record<string, unknown>) => CompactCanvasState;
  },
): Promise<void> {
  await modelContext.registerTool(
    {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      async execute(input) {
        try {
          await session.syncArms();
          const view = tool.run(input);
          return {
            content: [{ type: "text", text: JSON.stringify(view) }],
          };
        } catch (error) {
          const text =
            error instanceof Error ? error.message : "not ready";
          return {
            content: [{ type: "text", text }],
            isError: true,
          };
        }
      },
    },
    { signal },
  );
}

function stringArg(input: Record<string, unknown> | undefined, key: string): string {
  const value = input?.[key];
  return typeof value === "string" ? value : "";
}

function optionalStringArg(
  input: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = input?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberArg(
  input: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = input?.[key];
  return typeof value === "number" ? value : undefined;
}

function stringArrayArg(
  input: Record<string, unknown> | undefined,
  key: string,
): string[] | undefined {
  const value = input?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const ids = value.filter((item): item is string => typeof item === "string");
  return ids.length > 0 ? ids : undefined;
}

async function getModelContext(): Promise<ModelContext | null> {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const webmcp = await import("@mcp-b/global");
    webmcp.initializeWebModelContext();
  } catch {
    // Tests and pages without the polyfill keep going if a native context exists.
  }

  return (
    (document as Document & { modelContext?: ModelContext }).modelContext ??
    null
  );
}
