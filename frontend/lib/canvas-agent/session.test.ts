import { describe, expect, it } from "vitest";
import { createMemoryArmNetwork, type ArmBus } from "./arm-bus";
import {
  createCanvasAgentSession,
  type CanvasAgentPageShape,
} from "./session";

function shape(partial: CanvasAgentPageShape): CanvasAgentPageShape {
  return partial;
}

function createHarness(options?: {
  status?: string | null;
  allowed?: boolean;
  shapes?: CanvasAgentPageShape[];
  editor?: null;
  armBus?: ArmBus;
  network?: ReturnType<typeof createMemoryArmNetwork>;
  project?: { id: string; name: string };
}) {
  let status: string | null = options?.status ?? "ready";
  let shapes = options?.shapes ?? [];
  const editorMissing = options?.editor === null;
  const project = options?.project ?? {
    id: "project-1",
    name: "Owned Canvas",
  };
  const network = options?.network ?? createMemoryArmNetwork();
  const armBus = options?.armBus ?? network.attach("tab-1");
  if (options?.allowed !== false && !armBus.hasClaim()) {
    armBus.claim(project);
  }

  const session = createCanvasAgentSession({
    getProjectStatus: () => status,
    getEditor: () =>
      editorMissing ? null : { getCurrentPageShapes: () => shapes },
    armBus,
  });

  return {
    session,
    armBus,
    network,
    setStatus(next: string | null) {
      status = next;
    },
    setAllowed(next: boolean) {
      if (next) {
        armBus.claim(project);
        return;
      }
      armBus.release();
    },
    setShapes(next: CanvasAgentPageShape[]) {
      shapes = next;
    },
  };
}

describe("canvas-agent session", () => {
  it("refuses to read when the Project is not ready", () => {
    const { session } = createHarness({ status: "preview" });

    expect(() => session.readCanvasState()).toThrow("not ready");
    expect(session.shouldRegisterTools()).toBe(false);
  });

  it("refuses to read when the agent is not allowed on this tab", () => {
    const { session } = createHarness({ allowed: false });

    expect(() => session.readCanvasState()).toThrow("not allowed");
    expect(session.shouldRegisterTools()).toBe(false);
  });

  it("registers tools only when the Project is ready and this tab is allowed", () => {
    const { session, setStatus, setAllowed } = createHarness({
      status: "ready",
      allowed: true,
    });

    expect(session.shouldRegisterTools()).toBe(true);

    setStatus("generating");
    expect(session.shouldRegisterTools()).toBe(false);

    setStatus("ready");
    setAllowed(false);
    expect(session.shouldRegisterTools()).toBe(false);
  });

  it("maps generate-like boxes, arrows, and Flow titles plus leftover shapes", () => {
    const { session } = createHarness({
      shapes: [
        shape({
          id: "shape:web",
          type: "geo",
          x: 40,
          y: 80,
          geo: "rectangle",
          color: "blue",
          fill: "solid",
          label: "Web Client",
        }),
        shape({
          id: "shape:api",
          type: "geo",
          x: 300,
          y: 80,
          geo: "rectangle",
          color: "violet",
          fill: "solid",
          label: "API",
        }),
        shape({
          id: "shape:flow-checkout-title",
          type: "geo",
          x: 40,
          y: 20,
          geo: "rectangle",
          color: "grey",
          fill: "none",
          size: "l",
          label: "Checkout",
          generatedFrom: "flow:checkout",
        }),
        shape({
          id: "shape:arrow-web-to-api",
          type: "arrow",
          x: 260,
          y: 120,
          dash: "solid",
          label: "HTTPS",
          fromShapeId: "shape:web",
          toShapeId: "shape:api",
        }),
        shape({
          id: "shape:sketch",
          type: "draw",
          x: 12,
          y: 400,
          label: "",
        }),
        shape({
          id: "shape:photo",
          type: "image",
          x: 500,
          y: 40,
          label: "",
        }),
      ],
    });

    expect(session.readCanvasState()).toEqual({
      components: [
        {
          id: "shape:web",
          label: "Web Client",
          kind: "client",
          x: 40,
          y: 80,
        },
        {
          id: "shape:api",
          label: "API",
          kind: "service",
          x: 300,
          y: 80,
        },
      ],
      connections: [
        {
          id: "shape:arrow-web-to-api",
          from: "shape:web",
          to: "shape:api",
          style: "sync",
          label: "HTTPS",
        },
      ],
      flowTitles: [{ id: "shape:flow-checkout-title", label: "Checkout" }],
      notEditable: [
        { id: "shape:sketch", type: "draw" },
        { id: "shape:photo", type: "image" },
      ],
    });
  });

  it("reads the live editor on each call", () => {
    const { session, setShapes } = createHarness({
      shapes: [
        shape({
          id: "shape:api",
          type: "geo",
          x: 0,
          y: 0,
          geo: "rectangle",
          color: "violet",
          fill: "solid",
          label: "API",
        }),
      ],
    });

    expect(session.readCanvasState().components).toEqual([
      { id: "shape:api", label: "API", kind: "service", x: 0, y: 0 },
    ]);

    setShapes([
      shape({
        id: "shape:api",
        type: "geo",
        x: 0,
        y: 0,
        geo: "rectangle",
        color: "violet",
        fill: "solid",
        label: "API",
      }),
      shape({
        id: "shape:db",
        type: "geo",
        x: 240,
        y: 0,
        geo: "rectangle",
        color: "green",
        fill: "solid",
        label: "Postgres",
      }),
    ]);

    expect(session.readCanvasState().components).toEqual([
      { id: "shape:api", label: "API", kind: "service", x: 0, y: 0 },
      { id: "shape:db", label: "Postgres", kind: "store", x: 240, y: 0 },
    ]);
  });

  it("treats unknown geo, unbound arrows, and other leftovers as not editable", () => {
    const { session } = createHarness({
      shapes: [
        shape({
          id: "shape:cloud",
          type: "geo",
          x: 0,
          y: 0,
          geo: "cloud",
          color: "blue",
          fill: "solid",
          label: "Cloud",
        }),
        shape({
          id: "shape:title-cloud",
          type: "geo",
          x: 8,
          y: 8,
          geo: "cloud",
          color: "grey",
          fill: "none",
          size: "l",
          label: "Not a Flow",
        }),
        shape({
          id: "shape:loose-arrow",
          type: "arrow",
          x: 10,
          y: 10,
          dash: "dashed",
          label: "",
        }),
        shape({
          id: "shape:jobs",
          type: "geo",
          x: 80,
          y: 80,
          geo: "rectangle",
          color: "orange",
          fill: "solid",
          label: "Jobs",
        }),
        shape({
          id: "shape:async",
          type: "arrow",
          x: 20,
          y: 20,
          dash: "dashed",
          label: "",
          fromShapeId: "shape:jobs",
          toShapeId: "shape:jobs",
        }),
      ],
    });

    const view = session.readCanvasState();
    expect(view.components).toEqual([
      { id: "shape:jobs", label: "Jobs", kind: "queue", x: 80, y: 80 },
    ]);
    expect(view.connections).toEqual([
      {
        id: "shape:async",
        from: "shape:jobs",
        to: "shape:jobs",
        style: "async",
      },
    ]);
    expect(view.flowTitles).toEqual([]);
    expect(view.notEditable).toEqual([
      { id: "shape:cloud", type: "geo" },
      { id: "shape:title-cloud", type: "geo" },
      { id: "shape:loose-arrow", type: "arrow" },
    ]);
  });

  it("refuses to read when the live editor is missing", () => {
    const { session } = createHarness({ editor: null });

    expect(() => session.readCanvasState()).toThrow("not ready");
    expect(session.shouldRegisterTools()).toBe(true);
  });

  it("fails to read when two tabs look armed and names both Projects", async () => {
    const network = createMemoryArmNetwork();
    network.seed([
      {
        tabId: "tab-a",
        projectId: "project-1",
        projectName: "Checkout",
      },
      {
        tabId: "tab-b",
        projectId: "project-2",
        projectName: "Payments",
      },
    ]);
    const { session } = createHarness({
      network,
      armBus: network.attach("tab-a"),
      allowed: false,
    });

    expect(session.shouldRegisterTools()).toBe(true);
    await session.syncArms();
    expect(() => session.readCanvasState()).toThrow(
      '"Checkout" and "Payments" are both Active Projects.',
    );
  });

  it("keeps tools registered and readable while this tab is in the background", () => {
    const { session } = createHarness();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    expect(session.shouldRegisterTools()).toBe(true);
    expect(session.readCanvasState()).toEqual({
      components: [],
      connections: [],
      flowTitles: [],
      notEditable: [],
    });
  });

  it("unregisters and refuses to read after another tab takes over", () => {
    const { session, network } = createHarness();
    const other = network.attach("tab-2");

    other.takeOver({ id: "project-2", name: "Payments" });

    expect(session.shouldRegisterTools()).toBe(false);
    expect(() => session.readCanvasState()).toThrow("not allowed");
  });
});
