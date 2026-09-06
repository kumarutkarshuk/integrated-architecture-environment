import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

import {
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  TLPOINTER_ID,
  type TLInstancePresence,
  type TLStore,
} from "tldraw";
import {
  bindCanvasPresence,
  COLLABORATOR_COLORS,
  colorForUserId,
  PRESENCE_THROTTLE_MS,
  type AwarenessLike,
  type PresenceIdentity,
} from "./presence";

class FakeAwareness implements AwarenessLike {
  readonly clientID: number;
  private readonly states = new Map<number, Record<string, unknown>>();
  private readonly listeners = new Set<() => void>();

  constructor(clientID: number) {
    this.clientID = clientID;
  }

  getStates(): Map<number, Record<string, unknown>> {
    return this.states;
  }

  setLocalState(state: Record<string, unknown> | null): void {
    this.setClientState(this.clientID, state);
  }

  setClientState(clientID: number, state: Record<string, unknown> | null): void {
    if (state === null) {
      this.states.delete(clientID);
    } else {
      this.states.set(clientID, state);
    }
    for (const listener of this.listeners) {
      listener();
    }
  }

  on(event: "change", listener: () => void): void {
    if (event === "change") {
      this.listeners.add(listener);
    }
  }

  off(event: "change", listener: () => void): void {
    this.listeners.delete(listener);
  }
}

const localIdentity: PresenceIdentity = {
  userId: "user-local",
  name: "Ada",
};

const remoteState = {
  userId: "user-remote",
  name: "Bob",
  color: "#FF802B",
  cursor: { x: 40, y: 80 },
};

function createStore(): TLStore {
  return createTLStore({
    shapeUtils: [...defaultShapeUtils],
    bindingUtils: [...defaultBindingUtils],
  });
}

function presenceRecords(store: TLStore): TLInstancePresence[] {
  return Object.values(store.serialize("presence")).filter(
    (record): record is TLInstancePresence =>
      record.typeName === "instance_presence",
  );
}

describe("canvas presence module", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts remote awareness state into the tldraw store as a collaborator cursor", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });

    awareness.setClientState(7, remoteState);

    const remotes = presenceRecords(store);
    expect(remotes).toHaveLength(1);
    expect(remotes[0]).toMatchObject({
      typeName: "instance_presence",
      userName: "Bob",
      color: "#FF802B",
      cursor: { x: 40, y: 80, type: "default", rotation: 0 },
    });
  });

  it("removes a collaborator cursor when that client leaves", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });

    awareness.setClientState(7, remoteState);
    expect(presenceRecords(store)).toHaveLength(1);

    awareness.setClientState(7, null);
    expect(presenceRecords(store)).toHaveLength(0);
  });

  it("publishes local presence to awareness without showing the local client as a collaborator", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });

    const localState = awareness.getStates().get(1);
    expect(localState).toMatchObject({
      userId: "user-local",
      name: "Ada",
    });
    expect(localState?.color).toBe(colorForUserId("user-local"));
    expect(presenceRecords(store)).toHaveLength(0);
  });

  it("does not write presence into drawing records used for Canvas Snapshot", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });
    awareness.setClientState(7, remoteState);

    const drawingRecords = Object.values(store.serialize("document"));
    expect(
      drawingRecords.some((record) => record.typeName === "instance_presence"),
    ).toBe(false);
    expect(presenceRecords(store)).toHaveLength(1);
  });

  it("keeps two cursors when the same User is present on two clients", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);
    const sameUser = {
      userId: "user-ada",
      name: "Ada",
      color: "#02B1CC",
      cursor: { x: 1, y: 2 },
    };

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });
    awareness.setClientState(8, sameUser);
    awareness.setClientState(9, { ...sameUser, cursor: { x: 3, y: 4 } });

    expect(presenceRecords(store)).toHaveLength(2);
  });

  it("picks a stable collaborator color for a User id", () => {
    expect(colorForUserId("user-local")).toBe(colorForUserId("user-local"));
    expect(COLLABORATOR_COLORS).toContain(colorForUserId("user-local"));
  });

  it("throttles local awareness cursor writes", () => {
    vi.useFakeTimers();
    const store = createStore();
    const awareness = new FakeAwareness(1);
    const presence = bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });

    presence.publishLocalCursor({ x: 1, y: 1 });
    presence.publishLocalCursor({ x: 2, y: 2 });
    presence.publishLocalCursor({ x: 3, y: 3 });

    expect(awareness.getStates().get(1)?.cursor).toEqual({ x: 1, y: 1 });

    vi.advanceTimersByTime(PRESENCE_THROTTLE_MS);
    expect(awareness.getStates().get(1)?.cursor).toEqual({ x: 3, y: 3 });
  });

  it("publishes cursor movement from the local session pointer", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });

    const pointer = store.get(TLPOINTER_ID);
    expect(pointer).toBeDefined();
    if (!pointer) {
      return;
    }

    store.put([
      {
        ...pointer,
        x: 15,
        y: 25,
      },
    ]);

    expect(awareness.getStates().get(1)?.cursor).toEqual({ x: 15, y: 25 });
  });

  it("keeps a remote collaborator's activity time when a different client updates", () => {
    const store = createStore();
    const awareness = new FakeAwareness(1);

    bindCanvasPresence({
      awareness,
      store,
      identity: localIdentity,
    });

    awareness.setClientState(7, {
      ...remoteState,
      lastActivityTimestamp: 1000,
    });
    awareness.setClientState(8, {
      userId: "user-cara",
      name: "Cara",
      color: "#02B1CC",
      cursor: { x: 1, y: 1 },
      lastActivityTimestamp: 2000,
    });

    const bob = presenceRecords(store).find((record) => record.userName === "Bob");
    expect(bob).toMatchObject({ lastActivityTimestamp: 1000 });
  });
});
