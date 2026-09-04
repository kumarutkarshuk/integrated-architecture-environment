import { setPersistence } from "@y/websocket-server/utils";
import type { WSSharedDoc } from "@y/websocket-server/utils";
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

function scheduleSnapshotSave(projectId: string, doc: WSSharedDoc): void {
  const existing = debounceTimers.get(projectId);
  if (existing) {
    clearTimeout(existing);
  }

  debounceTimers.set(
    projectId,
    setTimeout(() => {
      debounceTimers.delete(projectId);
      void saveCanvasSnapshotFromDoc(
        projectId,
        doc as unknown as import("yjs").Doc,
      );
    }, DEBOUNCE_MS),
  );
}

export function configureCanvasPersistence(): void {
  setPersistence({
    provider: null,
    bindState: async (docName, doc) => {
      const projectId = docName;

      doc.on("update", () => {
        scheduleSnapshotSave(projectId, doc);
      });

      const snapshot = await loadCanvasSnapshot(projectId);

      if (snapshot && Object.keys(snapshot.records).length > 0) {
        applyRecordsToDoc(
          doc as unknown as import("yjs").Doc,
          projectId,
          snapshot.records,
        );
      }
    },
    writeState: async (docName, doc) => {
      const projectId = docName;
      const pending = debounceTimers.get(projectId);
      if (pending) {
        clearTimeout(pending);
        debounceTimers.delete(projectId);
      }
      await saveCanvasSnapshotFromDoc(
        projectId,
        doc as unknown as import("yjs").Doc,
      );
    },
  });
}
