import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBrowserArmBus,
  createMemoryArmNetwork,
} from "./arm-bus";
import { createCanvasAgentSession } from "./session";

const STORAGE_KEY = "iae.active-project";

function project(name = "Checkout") {
  return { id: "project-1", name };
}

function fakeEditor() {
  return {
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
  };
}

describe("browser arm bus", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        get length() {
          return store.size;
        },
        key: (index: number) => [...store.keys()][index] ?? null,
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      },
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("rejects a second window when another tab already claimed", () => {
    const first = createBrowserArmBus();
    const second = createBrowserArmBus();

    expect(first.claim(project()).ok).toBe(true);
    expect(second.claim(project()).ok).toBe(false);
    expect(second.hasClaim()).toBe(false);
  });

  it("still lists both windows after a storage race so the agent cannot draw", () => {
    const first = createBrowserArmBus();
    expect(first.claim(project()).ok).toBe(true);

    window.localStorage.setItem(
      "iae.active-project:other-tab",
      JSON.stringify({
        projectId: "project-2",
        projectName: "Payments",
        at: Date.now(),
      }),
    );

    expect(first.listArmed()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tabId: first.tabId, projectName: "Checkout" }),
        expect.objectContaining({
          tabId: "other-tab",
          projectName: "Payments",
        }),
      ]),
    );

    const session = createCanvasAgentSession({
      getProjectStatus: () => "ready",
      getEditor: () => fakeEditor(),
      armBus: first,
    });

    expect(() =>
      session.createComponent({ kind: "service", label: "API" }),
    ).toThrow(
      'Two windows have agents allowed ("Checkout" and "Payments"). Turn off Allow agent in one window, then try again.',
    );
  });

  it("stops the agent on the window that took over while the other is still allowed", () => {
    const channel = window.BroadcastChannel;
    Object.defineProperty(window, "BroadcastChannel", {
      configurable: true,
      value: undefined,
    });

    try {
      const first = createBrowserArmBus();
      const second = createBrowserArmBus();
      expect(first.claim(project()).ok).toBe(true);
      second.takeOver(project("Payments"));

      expect(first.hasClaim()).toBe(true);
      expect(second.hasClaim()).toBe(true);
      expect(second.listArmed().length).toBeGreaterThanOrEqual(2);

      const session = createCanvasAgentSession({
        getProjectStatus: () => "ready",
        getEditor: () => fakeEditor(),
        armBus: second,
      });

      expect(() =>
        session.createComponent({ kind: "service", label: "API" }),
      ).toThrow(/Two windows have agents allowed/);
    } finally {
      Object.defineProperty(window, "BroadcastChannel", {
        configurable: true,
        value: channel,
      });
    }
  });

  it("reads a legacy single stored claim", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tabId: "legacy-tab",
        projectId: "project-9",
        projectName: "Legacy",
      }),
    );

    const bus = createBrowserArmBus();
    expect(bus.listArmed()).toEqual([
      {
        tabId: "legacy-tab",
        projectId: "project-9",
        projectName: "Legacy",
      },
    ]);
    expect(bus.claim(project()).ok).toBe(false);
  });
});

describe("memory arm network", () => {
  it("keeps one holder until take over", () => {
    const network = createMemoryArmNetwork();
    const first = network.attach("tab-a");
    const second = network.attach("tab-b");

    expect(first.claim(project()).ok).toBe(true);
    expect(second.claim(project("Payments")).ok).toBe(false);

    second.takeOver(project("Payments"));
    expect(first.hasClaim()).toBe(false);
    expect(second.hasClaim()).toBe(true);
  });
});
