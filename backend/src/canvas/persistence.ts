import {
  setPersistence,
  type WSSharedDoc,
} from "./yjs-ws-utils.js";
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
  try {
    await saveCanvasSnapshotFromDoc(projectId, doc);
  } catch (error) {
    console.error("Failed to persist canvas snapshot", projectId, error);
  }
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
      void persistCanvasSnapshot(projectId, doc);
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
      await persistCanvasSnapshot(projectId, doc);
    },
  });
}
