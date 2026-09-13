import { describe, expect, it } from "vitest";
import { createMemoryArmNetwork, type ArmBus } from "./arm-bus";
import {
  createCanvasAgentSession,
  type CanvasAgentEditorPort,
  type CanvasAgentPageShape,
  type ShapeBounds,
} from "./session";

function shape(partial: CanvasAgentPageShape): CanvasAgentPageShape {
  return partial;
}

function createFakeEditor(
  initial: CanvasAgentPageShape[] = [],
  writable = true,
): CanvasAgentEditorPort & {
  selectedIds: string[];
  zoomCalls: ShapeBounds[];
  setShapes(next: CanvasAgentPageShape[]): void;
  setWritable(next: boolean): void;
} {
  let shapes = [...initial];
  let isWritable = writable;
  const zoomCalls: ShapeBounds[] = [];
  const selectedIds: string[] = [];

  return {
    selectedIds,
    zoomCalls,
    getCurrentPageShapes() {
      return shapes;
    },
    isWritable() {
      return isWritable;
    },
    setWritable(next) {
      isWritable = next;
    },
    setShapes(next) {
      shapes = next;
    },
    getShapeBounds(id) {
      const found = shapes.find((item) => item.id === id);
      if (!found) {
        return null;
      }
      return {
        x: found.x,
        y: found.y,
        w: found.w ?? 220,
        h: found.h ?? 100,
      };
    },
    createShape(next) {
      shapes = [...shapes, next];
    },
    updateShape(id, patch) {
      shapes = shapes.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      );
    },
    deleteShape(id) {
      shapes = shapes.filter((item) => item.id !== id);
    },
    zoomToBounds(bounds) {
      zoomCalls.push(bounds);
    },
  };
}

function createHarness(options?: {
  status?: string | null;
  allowed?: boolean;
  writable?: boolean;
  shapes?: CanvasAgentPageShape[];
  editor?: null;
  armBus?: ArmBus;
  network?: ReturnType<typeof createMemoryArmNetwork>;
  project?: { id: string; name: string };
}) {
  let status: string | null = options?.status ?? "ready";
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
  const editor = editorMissing
    ? null
    : createFakeEditor(options?.shapes ?? [], options?.writable ?? true);

  const session = createCanvasAgentSession({
    getProjectStatus: () => status,
    getEditor: () => editor,
    armBus,
  });

  return {
    session,
    editor,
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
      editor?.setShapes(next);
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

  it("adds kind boxes with generate colors", () => {
    const { session, editor } = createHarness();

    const created = [
      session.createComponent({ kind: "client", label: "Web", x: 40, y: 80 }),
      session.createComponent({
        kind: "service",
        label: "API",
        x: 300,
        y: 80,
      }),
      session.createComponent({
        kind: "store",
        label: "Postgres",
        x: 560,
        y: 80,
      }),
      session.createComponent({
        kind: "queue",
        label: "Jobs",
        x: 40,
        y: 240,
      }),
      session.createComponent({
        kind: "storage",
        label: "S3",
        x: 300,
        y: 240,
      }),
      session.createComponent({
        kind: "external",
        label: "Stripe",
        x: 560,
        y: 240,
      }),
    ];

    expect(created.at(-1)?.components).toEqual([
      { id: expect.any(String), label: "Web", kind: "client", x: 40, y: 80 },
      { id: expect.any(String), label: "API", kind: "service", x: 300, y: 80 },
      {
        id: expect.any(String),
        label: "Postgres",
        kind: "store",
        x: 560,
        y: 80,
      },
      { id: expect.any(String), label: "Jobs", kind: "queue", x: 40, y: 240 },
      { id: expect.any(String), label: "S3", kind: "storage", x: 300, y: 240 },
      {
        id: expect.any(String),
        label: "Stripe",
        kind: "external",
        x: 560,
        y: 240,
      },
    ]);
    expect(editor?.getCurrentPageShapes().map((item) => item.color)).toEqual([
      "blue",
      "violet",
      "green",
      "orange",
      "yellow",
      "grey",
    ]);
  });

  it("places a new box to the right of existing content when x and y are omitted", () => {
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
          label: "Web",
        }),
      ],
    });

    const view = session.createComponent({ kind: "service", label: "API" });

    expect(view.components).toEqual([
      { id: "shape:web", label: "Web", kind: "client", x: 40, y: 80 },
      { id: expect.any(String), label: "API", kind: "service", x: 300, y: 80 },
    ]);
  });

  it("refuses an unknown kind and leaves Canvas State unchanged", () => {
    const { session } = createHarness();

    expect(() =>
      session.createComponent({ kind: "widget", label: "Mystery" }),
    ).toThrow("unknown kind");
    expect(session.readCanvasState()).toEqual({
      components: [],
      connections: [],
      flowTitles: [],
      notEditable: [],
    });
  });

  it("adds styled arrows with generate dash styles", () => {
    const { session, editor } = createHarness({
      shapes: [
        shape({
          id: "shape:web",
          type: "geo",
          x: 40,
          y: 80,
          geo: "rectangle",
          color: "blue",
          fill: "solid",
          label: "Web",
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
          id: "shape:jobs",
          type: "geo",
          x: 560,
          y: 80,
          geo: "rectangle",
          color: "orange",
          fill: "solid",
          label: "Jobs",
        }),
      ],
    });

    session.createConnection({
      from: "shape:web",
      to: "shape:api",
      style: "sync",
      label: "HTTPS",
    });
    session.createConnection({
      from: "shape:api",
      to: "shape:jobs",
      style: "async",
    });
    const view = session.createConnection({
      from: "shape:jobs",
      to: "shape:api",
      style: "data",
    });

    expect(view.connections).toEqual([
      {
        id: expect.any(String),
        from: "shape:web",
        to: "shape:api",
        style: "sync",
        label: "HTTPS",
      },
      {
        id: expect.any(String),
        from: "shape:api",
        to: "shape:jobs",
        style: "async",
      },
      {
        id: expect.any(String),
        from: "shape:jobs",
        to: "shape:api",
        style: "data",
      },
    ]);
    expect(
      editor
        ?.getCurrentPageShapes()
        .filter((item) => item.type === "arrow")
        .map((item) => item.dash),
    ).toEqual(["solid", "dashed", "dotted"]);
  });

  it("refuses an unknown connection style and leaves Canvas State unchanged", () => {
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
          label: "Web",
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
      ],
    });

    expect(() =>
      session.createConnection({
        from: "shape:web",
        to: "shape:api",
        style: "rpc",
      }),
    ).toThrow("unknown style");
    expect(session.readCanvasState().connections).toEqual([]);
  });

  it("adds, moves, renames, and deletes a Flow title", () => {
    const { session } = createHarness();

    const created = session.createFlowTitle({
      label: "Checkout",
      x: 40,
      y: 20,
    });
    const titleId = created.flowTitles[0]?.id;
    expect(created.flowTitles).toEqual([{ id: titleId, label: "Checkout" }]);

    expect(
      session.moveShape({ id: titleId!, x: 80, y: 40 }).flowTitles,
    ).toEqual([{ id: titleId, label: "Checkout" }]);
    expect(
      session.renameShape({ id: titleId!, label: "Pay" }).flowTitles,
    ).toEqual([{ id: titleId, label: "Pay" }]);
    expect(session.deleteShape(titleId!).flowTitles).toEqual([]);
  });

  it("moves, renames, and deletes kind boxes and styled arrows", () => {
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
          label: "Web",
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
          id: "shape:arrow",
          type: "arrow",
          x: 260,
          y: 120,
          dash: "solid",
          label: "HTTPS",
          fromShapeId: "shape:web",
          toShapeId: "shape:api",
        }),
      ],
    });

    expect(
      session.moveShape({ id: "shape:api", x: 420, y: 160 }).components,
    ).toContainEqual({
      id: "shape:api",
      label: "API",
      kind: "service",
      x: 420,
      y: 160,
    });
    expect(
      session.renameShape({ id: "shape:web", label: "Browser" }).components,
    ).toContainEqual({
      id: "shape:web",
      label: "Browser",
      kind: "client",
      x: 40,
      y: 80,
    });
    expect(
      session.renameShape({ id: "shape:arrow", label: "gRPC" }).connections,
    ).toEqual([
      {
        id: "shape:arrow",
        from: "shape:web",
        to: "shape:api",
        style: "sync",
        label: "gRPC",
      },
    ]);
    expect(
      session.moveShape({ id: "shape:arrow", x: 280, y: 140 }).connections,
    ).toEqual([
      {
        id: "shape:arrow",
        from: "shape:web",
        to: "shape:api",
        style: "sync",
        label: "gRPC",
      },
    ]);
    expect(session.deleteShape("shape:arrow").connections).toEqual([]);
    expect(session.deleteShape("shape:web").components).toEqual([
      { id: "shape:api", label: "API", kind: "service", x: 420, y: 160 },
    ]);
  });

  it("refuses create, move, and delete of freehand, images, and extra geo", () => {
    const leftovers = [
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
        id: "shape:frame",
        type: "frame",
        x: 8,
        y: 8,
        label: "Frame",
      }),
      shape({
        id: "shape:note",
        type: "note",
        x: 16,
        y: 16,
        label: "Note",
      }),
      shape({
        id: "shape:stamp",
        type: "stamp",
        x: 24,
        y: 24,
        label: "",
      }),
    ];
    const { session } = createHarness({ shapes: leftovers });
    const before = session.readCanvasState();

    expect(() => session.moveShape({ id: "shape:sketch", x: 1, y: 1 })).toThrow(
      "cannot move this shape",
    );
    expect(() =>
      session.renameShape({ id: "shape:photo", label: "shot" }),
    ).toThrow("cannot rename this shape");
    expect(() => session.deleteShape("shape:cloud")).toThrow(
      "cannot delete this shape",
    );
    expect(() => session.deleteShape("shape:frame")).toThrow(
      "cannot delete this shape",
    );
    expect(() => session.moveShape({ id: "shape:note", x: 2, y: 2 })).toThrow(
      "cannot move this shape",
    );
    expect(() => session.deleteShape("shape:stamp")).toThrow(
      "cannot delete this shape",
    );
    expect(session.readCanvasState()).toEqual(before);
    expect(before.notEditable).toEqual([
      { id: "shape:sketch", type: "draw" },
      { id: "shape:photo", type: "image" },
      { id: "shape:cloud", type: "geo" },
      { id: "shape:frame", type: "frame" },
      { id: "shape:note", type: "note" },
      { id: "shape:stamp", type: "stamp" },
    ]);
  });

  it("refuses writes when not ready, not allowed, read-only, or two tabs are armed", async () => {
    const notReady = createHarness({ status: "preview" });
    expect(() =>
      notReady.session.createComponent({ kind: "client", label: "Web" }),
    ).toThrow("not ready");

    const notAllowed = createHarness({ allowed: false });
    expect(() =>
      notAllowed.session.createComponent({ kind: "client", label: "Web" }),
    ).toThrow("not allowed");

    const readOnly = createHarness({ writable: false });
    expect(() =>
      readOnly.session.createComponent({ kind: "client", label: "Web" }),
    ).toThrow("read-only");
    expect(readOnly.session.readCanvasState().components).toEqual([]);

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
    const dual = createHarness({
      network,
      armBus: network.attach("tab-a"),
      allowed: false,
    });
    await dual.session.syncArms();
    expect(() =>
      dual.session.createComponent({ kind: "client", label: "Web" }),
    ).toThrow('"Checkout" and "Payments" are both Active Projects.');
    expect(dual.editor?.getCurrentPageShapes()).toEqual([]);
  });

  it("follows the touched shape on this tab and does not steal selection", () => {
    const { session, editor } = createHarness({
      shapes: [
        shape({
          id: "shape:web",
          type: "geo",
          x: 40,
          y: 80,
          geo: "rectangle",
          color: "blue",
          fill: "solid",
          label: "Web",
        }),
      ],
    });
    editor!.selectedIds.push("shape:web");

    const view = session.createComponent({
      kind: "service",
      label: "API",
      x: 300,
      y: 80,
    });
    const createdId = view.components[1]?.id;

    expect(editor?.zoomCalls).toEqual([{ x: 300, y: 80, w: 220, h: 100 }]);
    expect(editor?.selectedIds).toEqual(["shape:web"]);
    expect(createdId).toBeTruthy();

    session.moveShape({ id: createdId!, x: 320, y: 100 });
    expect(editor?.zoomCalls.at(-1)).toEqual({
      x: 320,
      y: 100,
      w: 220,
      h: 100,
    });
    expect(editor?.selectedIds).toEqual(["shape:web"]);
  });
});
