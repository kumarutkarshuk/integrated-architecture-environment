import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as map from "lib0/map";
import * as Y from "yjs";

const gcEnabled = process.env.GC !== "false" && process.env.GC !== "0";

const messageSync = 0;
const messageAwareness = 1;

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

export interface CanvasPersistence {
  bindState: (docName: string, doc: WSSharedDoc) => void | Promise<void>;
  writeState: (docName: string, doc: WSSharedDoc) => Promise<void>;
}

let persistence: CanvasPersistence | null = null;

export function setPersistence(nextPersistence: CanvasPersistence | null): void {
  persistence = nextPersistence;
}

export const docs = new Map<string, WSSharedDoc>();

export class WSSharedDoc extends Y.Doc {
  name: string;
  conns = new Map<WebSocket, Set<number>>();
  awareness: awarenessProtocol.Awareness;
  bindPromise: Promise<void> = Promise.resolve();

  constructor(name: string) {
    super({ gc: gcEnabled });
    this.name = name;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = (
      {
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      },
      conn: WebSocket | null,
    ) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIds = this.conns.get(conn);
        if (connControlledIds !== undefined) {
          for (const clientId of added) {
            connControlledIds.add(clientId);
          }
          for (const clientId of removed) {
            connControlledIds.delete(clientId);
          }
        }
      }

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
      );
      const message = encoding.toUint8Array(encoder);
      for (const connection of this.conns.keys()) {
        send(this, connection, message);
      }
    };

    this.awareness.on("update", awarenessChangeHandler);
    this.on(
      "update",
      (update: Uint8Array, origin: unknown, _doc: Y.Doc) => {
        updateHandler(update, origin, this);
      },
    );
  }
}

function updateHandler(
  update: Uint8Array,
  _origin: unknown,
  doc: WSSharedDoc,
): void {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);

  for (const connection of doc.conns.keys()) {
    send(doc, connection, message);
  }
}

export function getYDoc(docName: string, gc = true): WSSharedDoc {
  return map.setIfUndefined(docs, docName, () => {
    const doc = new WSSharedDoc(docName);
    doc.gc = gc;
    if (persistence !== null) {
      doc.bindPromise = Promise.resolve(persistence.bindState(docName, doc));
    }
    docs.set(docName, doc);
    return doc;
  });
}

export function whenCanvasDocReady(doc: WSSharedDoc): Promise<void> {
  return doc.bindPromise;
}

function messageListener(
  conn: WebSocket,
  doc: WSSharedDoc,
  message: Uint8Array,
): void {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      }
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
      }
    }
  } catch (error) {
    console.error("Caught error while handling a Yjs update", error);
  }
}

function closeConn(doc: WSSharedDoc, conn: WebSocket): void {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn) ?? new Set<number>();
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null,
    );

    if (doc.conns.size === 0 && persistence !== null) {
      void persistence
        .writeState(doc.name, doc)
        .then(() => {
          if (docs.get(doc.name) === doc && doc.conns.size === 0) {
            doc.destroy();
            docs.delete(doc.name);
          }
        })
        .catch((error) => {
          console.error(
            "Failed to persist canvas snapshot before room teardown",
            doc.name,
            error,
          );
        });
    }
  }

  conn.close();
}

function send(doc: WSSharedDoc, conn: WebSocket, message: Uint8Array): void {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
    return;
  }

  try {
    conn.send(message, {}, (error) => {
      if (error != null) {
        closeConn(doc, conn);
      }
    });
  } catch {
    closeConn(doc, conn);
  }
}

const pingTimeoutMs = 30_000;

export function setupWSConnection(
  conn: WebSocket,
  req: IncomingMessage,
  {
    docName = (req.url ?? "").slice(1).split("?")[0],
    gc = true,
  }: { docName?: string; gc?: boolean } = {},
): void {
  conn.binaryType = "arraybuffer";
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, new Set());

  let bound = false;
  const pending: Uint8Array[] = [];

  conn.on("message", (message) => {
    const bytes = new Uint8Array(message as ArrayBuffer);
    if (!bound) {
      pending.push(bytes);
      return;
    }
    messageListener(conn, doc, bytes);
  });

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
      return;
    }

    if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeoutMs);

  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });

  conn.on("pong", () => {
    pongReceived = true;
  });

  void doc.bindPromise
    .then(() => {
      if (!doc.conns.has(conn)) {
        return;
      }

      bound = true;
      for (const bytes of pending) {
        messageListener(conn, doc, bytes);
      }
      pending.length = 0;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeSyncStep1(encoder, doc);
      send(doc, conn, encoding.toUint8Array(encoder));

      const awarenessStates = doc.awareness.getStates();
      if (awarenessStates.size > 0) {
        const awarenessEncoder = encoding.createEncoder();
        encoding.writeVarUint(awarenessEncoder, messageAwareness);
        encoding.writeVarUint8Array(
          awarenessEncoder,
          awarenessProtocol.encodeAwarenessUpdate(
            doc.awareness,
            Array.from(awarenessStates.keys()),
          ),
        );
        send(doc, conn, encoding.toUint8Array(awarenessEncoder));
      }
    })
    .catch((error) => {
      console.error("Failed to bind canvas snapshot", doc.name, error);
      closeConn(doc, conn);
      clearInterval(pingInterval);
    });
}

export function clearCanvasDocs(): void {
  docs.clear();
}

export function teardownCanvasDoc(projectId: string): void {
  const doc = docs.get(projectId);
  if (!doc) {
    return;
  }

  for (const connection of [...doc.conns.keys()]) {
    doc.conns.delete(connection);
    try {
      connection.close();
    } catch {
      // Ignore errors while tearing down deleted projects.
    }
  }

  doc.destroy();
  docs.delete(projectId);
}
