import {
  createUserId,
  InstancePresenceRecordType,
  TLPOINTER_ID,
  type TLInstancePresence,
  type TLPageId,
  type TLStore,
} from "tldraw";
import { CANVAS_PAGE_ID } from "./canvas";

export type PresenceIdentity = {
  userId: string;
  name: string;
};

export type PresenceCursor = {
  x: number;
  y: number;
};

export type AwarenessLike = {
  clientID: number;
  getStates(): Map<number, Record<string, unknown>>;
  setLocalState(state: Record<string, unknown> | null): void;
  on(event: "change", listener: () => void): void;
  off(event: "change", listener: () => void): void;
};

export const PRESENCE_THROTTLE_MS = 50;

export const COLLABORATOR_COLORS = [
  "#FF802B",
  "#EC5E41",
  "#F2555A",
  "#F04F88",
  "#E34BA9",
  "#BD54C6",
  "#9D5BD2",
  "#7B66DC",
  "#02B1CC",
  "#11B3A3",
  "#39B178",
  "#55B467",
] as const;

type PresenceState = {
  userId: string;
  name: string;
  color: string;
  cursor: PresenceCursor | null;
  lastActivityTimestamp: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCursor(value: unknown): PresenceCursor | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.x !== "number" || typeof value.y !== "number") {
    return null;
  }
  return { x: value.x, y: value.y };
}

function readPresenceState(value: unknown): PresenceState | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.userId !== "string" || typeof value.name !== "string") {
    return null;
  }
  if (typeof value.color !== "string") {
    return null;
  }
  return {
    userId: value.userId,
    name: value.name,
    color: value.color,
    cursor: readCursor(value.cursor),
    lastActivityTimestamp:
      typeof value.lastActivityTimestamp === "number"
        ? value.lastActivityTimestamp
        : 0,
  };
}

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return COLLABORATOR_COLORS[hash % COLLABORATOR_COLORS.length];
}

function toPresenceRecord(
  clientID: number,
  state: PresenceState,
): TLInstancePresence {
  return InstancePresenceRecordType.create({
    id: InstancePresenceRecordType.createId(String(clientID)),
    userId: createUserId(`${state.userId}:${clientID}`),
    userName: state.name,
    color: state.color,
    currentPageId: CANVAS_PAGE_ID as TLPageId,
    cursor: state.cursor
      ? {
          x: state.cursor.x,
          y: state.cursor.y,
          type: "default",
          rotation: 0,
        }
      : null,
    lastActivityTimestamp: state.lastActivityTimestamp,
  });
}

export function bindCanvasPresence(options: {
  awareness: AwarenessLike;
  store: TLStore;
  identity: PresenceIdentity;
}): {
  publishLocalCursor(cursor: PresenceCursor | null): void;
  disconnect(): void;
} {
  const { awareness, store, identity } = options;
  const color = colorForUserId(identity.userId);

  function publishLocal(cursor: PresenceCursor | null): void {
    awareness.setLocalState({
      userId: identity.userId,
      name: identity.name,
      color,
      cursor,
      lastActivityTimestamp: Date.now(),
    });
  }

  let throttleTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingCursor: PresenceCursor | null | undefined;

  function publishLocalCursor(cursor: PresenceCursor | null): void {
    if (throttleTimer !== null) {
      pendingCursor = cursor;
      return;
    }

    publishLocal(cursor);
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      if (pendingCursor !== undefined) {
        const nextCursor = pendingCursor;
        pendingCursor = undefined;
        publishLocalCursor(nextCursor);
      }
    }, PRESENCE_THROTTLE_MS);
  }

  let lastPublishedCursor: PresenceCursor | null | undefined;

  function cursorFromStore(): PresenceCursor | null {
    const pointer = store.get(TLPOINTER_ID);
    if (!pointer) {
      return null;
    }
    return { x: pointer.x, y: pointer.y };
  }

  function publishPointerIfChanged(): void {
    const cursor = cursorFromStore();
    if (
      lastPublishedCursor === cursor ||
      (lastPublishedCursor != null &&
        cursor != null &&
        lastPublishedCursor.x === cursor.x &&
        lastPublishedCursor.y === cursor.y)
    ) {
      return;
    }
    lastPublishedCursor = cursor;
    publishLocalCursor(cursor);
  }

  function applyRemotePresence(): void {
    const keep = new Set<TLInstancePresence["id"]>();
    const toPut: TLInstancePresence[] = [];

    for (const [clientID, rawState] of awareness.getStates()) {
      if (clientID === awareness.clientID) {
        continue;
      }

      const state = readPresenceState(rawState);
      if (!state) {
        continue;
      }

      const record = toPresenceRecord(clientID, state);
      keep.add(record.id);
      toPut.push(record);
    }

    const toRemove = Object.values(store.serialize("presence"))
      .filter((record) => record.typeName === "instance_presence")
      .map((record) => record.id)
      .filter((id) => !keep.has(id as TLInstancePresence["id"]));

    store.mergeRemoteChanges(() => {
      if (toPut.length > 0) {
        store.put(toPut);
      }
      if (toRemove.length > 0) {
        store.remove(toRemove);
      }
    });
  }

  const initialCursor = cursorFromStore();
  lastPublishedCursor = initialCursor;
  publishLocal(initialCursor);
  applyRemotePresence();
  awareness.on("change", applyRemotePresence);

  const unsubscribePointer = store.listen(
    () => {
      publishPointerIfChanged();
    },
    { scope: "session" },
  );

  let disconnected = false;

  return {
    publishLocalCursor,
    disconnect() {
      if (disconnected) {
        return;
      }
      disconnected = true;
      if (throttleTimer !== null) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      pendingCursor = undefined;
      unsubscribePointer();
      awareness.off("change", applyRemotePresence);
      awareness.setLocalState(null);
    },
  };
}
