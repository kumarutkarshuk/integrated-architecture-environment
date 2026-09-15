import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureProductEvent } from "../analytics";
import { createMemoryArmNetwork } from "./arm-bus";
import { createCanvasAgentSession } from "./session";
import { registerCanvasAgentTools } from "./webmcp";

vi.mock("../analytics", () => ({
  captureProductEvent: vi.fn(),
}));

vi.mock("@mcp-b/global", () => ({
  initializeWebModelContext: () => undefined,
}));

type RegisteredTool = {
  name: string;
  execute: (
    input?: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
};

describe("registerCanvasAgentTools", () => {
  const tools: RegisteredTool[] = [];

  beforeEach(() => {
    tools.length = 0;
    vi.mocked(captureProductEvent).mockReset();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: async (tool: RegisteredTool) => {
          tools.push(tool);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "modelContext");
  });

  it("records webmcp_tool_used when an agent reads Canvas State", async () => {
    const session = createReadySession();
    await registerCanvasAgentTools(session, new AbortController().signal);

    const read = tools.find((tool) => tool.name === "read_canvas_state");
    const result = await read?.execute({});

    expect(result?.isError).toBeUndefined();
    expect(captureProductEvent).toHaveBeenCalledWith("webmcp_tool_used", {
      tool: "read_canvas_state",
      ok: true,
      projectId: "project-1",
    });
  });

  it("records a failed webmcp_tool_used without canvas labels", async () => {
    const session = createReadySession();
    await registerCanvasAgentTools(session, new AbortController().signal);

    const create = tools.find((tool) => tool.name === "create_component");
    const result = await create?.execute({ kind: "unknown", label: "Secret API" });

    expect(result?.isError).toBe(true);
    expect(captureProductEvent).toHaveBeenCalledWith("webmcp_tool_used", {
      tool: "create_component",
      ok: false,
      projectId: "project-1",
    });
    expect(JSON.stringify(vi.mocked(captureProductEvent).mock.calls)).not.toContain(
      "Secret API",
    );
  });
});

function createReadySession() {
  const armBus = createMemoryArmNetwork().attach("tab-1");
  armBus.claim({ id: "project-1", name: "Owned Canvas" });

  return createCanvasAgentSession({
    getProjectStatus: () => "ready",
    getEditor: () => ({
      getCurrentPageShapes: () => [],
      isWritable: () => true,
      getShapeBounds: () => null,
      createShape: () => undefined,
      updateShape: () => undefined,
      deleteShape: () => undefined,
      zoomToBounds: () => undefined,
      zoomIn: () => undefined,
      zoomOut: () => undefined,
      clampZoom: () => undefined,
    }),
    armBus,
  });
}
