import { childLogger } from "../logger.js";
import {
  setPersistence,
  type WSSharedDoc,
} from "./yjs-ws-utils.js";

const log = childLogger({ module: "canvas-persistence" });
import {
  applyRecordsToDoc,
  saveCanvasSnapshotFromDoc,
  loadCanvasSnapshot,
} from "./snapshot.js";

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 2000;

export function clearCanvasPersistenceTimers(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}

export function clearCanvasPersistenceTimer(projectId: string): void {
  const pending = debounceTimers.get(projectId);
  if (pending) {
    clearTimeout(pending);
    debounceTimers.delete(projectId);
  }
}

async function persistCanvasSnapshot(
  projectId: string,
  doc: WSSharedDoc,
): Promise<void> {
  await saveCanvasSnapshotFromDoc(projectId, doc);
}

const WRITE_STATE_ATTEMPTS = 3;

async function persistCanvasSnapshotWithRetry(
  projectId: string,
  doc: WSSharedDoc,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= WRITE_STATE_ATTEMPTS; attempt += 1) {
    try {
      await persistCanvasSnapshot(projectId, doc);
      return;
    } catch (error) {
      lastError = error;
      log.error(
        {
          err: error,
          projectId,
          attempt,
          maxAttempts: WRITE_STATE_ATTEMPTS,
        },
        "Failed to persist canvas snapshot",
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to persist canvas snapshot");
}

function scheduleSnapshotSave(projectId: string, doc: WSSharedDoc): void {
  const existing = debounceTimers.get(projectId);
  if (existing) {
    clearTimeout(existing);
  }

  debounceTimers.set(
    projectId,
    setTimeout(() => {
      debounceTimers.delete(projectId);
      void persistCanvasSnapshot(projectId, doc).catch((error) => {
        log.error({ err: error, projectId }, "Failed to persist canvas snapshot");
      });
    }, DEBOUNCE_MS),
  );
}

export function configureCanvasPersistence(): void {
  setPersistence({
    bindState: async (docName, doc) => {
      const projectId = docName;

      doc.on("update", () => {
        scheduleSnapshotSave(projectId, doc);
      });

      const snapshot = await loadCanvasSnapshot(projectId);

      if (snapshot && Object.keys(snapshot.records).length > 0) {
        applyRecordsToDoc(doc, projectId, snapshot.records);
      }
    },
    writeState: async (docName, doc) => {
      const projectId = docName;
      clearCanvasPersistenceTimer(projectId);
      await persistCanvasSnapshotWithRetry(projectId, doc);
    },
  });
}
