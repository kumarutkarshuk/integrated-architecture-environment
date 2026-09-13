import type { CanvasAgentSession } from "./session";

const EMBED_SRC =
  "https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@latest/dist/browser/embed.js";

type ModelContext = {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      execute: () => Promise<{
        content: Array<{ type: "text"; text: string }>;
        isError?: boolean;
      }>;
    },
    options?: { signal?: AbortSignal },
  ): Promise<void>;
};

export function mountWebMcpRelayEmbed(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.querySelector("script[data-iae-webmcp-embed]")) {
    return;
  }

  const script = document.createElement("script");
  script.src = EMBED_SRC;
  script.async = true;
  script.dataset.iaeWebmcpEmbed = "";
  document.body.appendChild(script);
}

export async function registerCanvasReadTool(
  session: CanvasAgentSession,
  signal: AbortSignal,
): Promise<void> {
  const modelContext = await getModelContext();
  if (!modelContext || signal.aborted) {
    return;
  }

  await modelContext.registerTool(
    {
      name: "read_canvas_state",
      description:
        "Read a compact live view of this tab's Canvas State: generate-like boxes, arrows, Flow titles, and other shapes the agent cannot edit.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        try {
          const view = session.readCanvasState();
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
