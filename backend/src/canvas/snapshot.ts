import type * as Y from "yjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

export const CANVAS_YARRAY_PREFIX = "tl_";

export interface CanvasSnapshotJson {
  records: Record<string, unknown>;
}

export function getCanvasYArrayName(projectId: string): string {
  return `${CANVAS_YARRAY_PREFIX}${projectId}`;
}

type CanvasRecordEntry = { key: string; val: unknown };

function readRecordsFromYArray(
  yArray: Y.Array<CanvasRecordEntry>,
): Record<string, unknown> {
  const records: Record<string, unknown> = {};
  const entries = yArray.toArray();

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!(entry.key in records)) {
      records[entry.key] = entry.val;
    }
  }

  return records;
}

export function readRecordsFromDoc(
  doc: Y.Doc,
  projectId: string,
): Record<string, unknown> {
  const yArray = doc.getArray<CanvasRecordEntry>(getCanvasYArrayName(projectId));
  return readRecordsFromYArray(yArray);
}

export function applyRecordsToDoc(
  doc: Y.Doc,
  projectId: string,
  records: Record<string, unknown>,
): void {
  const yArray = doc.getArray<CanvasRecordEntry>(getCanvasYArrayName(projectId));

  doc.transact(() => {
    for (const [key, value] of Object.entries(records)) {
      yArray.push([{ key, val: value }]);
    }
  });
}

export function replaceRecordsInDoc(
  doc: Y.Doc,
  projectId: string,
  records: Record<string, unknown>,
): void {
  const yArray = doc.getArray<CanvasRecordEntry>(getCanvasYArrayName(projectId));

  doc.transact(() => {
    if (yArray.length > 0) {
      yArray.delete(0, yArray.length);
    }

    for (const [key, value] of Object.entries(records)) {
      yArray.push([{ key, val: value }]);
    }
  });
}

export async function loadCanvasSnapshot(
  projectId: string,
): Promise<CanvasSnapshotJson | null> {
  const snapshot = await prisma.canvasSnapshot.findUnique({
    where: { projectId },
  });

  if (!snapshot) {
    return null;
  }

  const json = snapshot.tldrawJson as unknown as CanvasSnapshotJson;

  if (!json || typeof json !== "object" || !json.records) {
    return { records: {} };
  }

  return json;
}

function toJsonValue(records: Record<string, unknown>): Prisma.InputJsonValue {
  return { records } as Prisma.InputJsonValue;
}

export async function upsertCanvasSnapshot(
  projectId: string,
  records: Record<string, unknown>,
): Promise<void> {
  const tldrawJson = toJsonValue(records);

  await prisma.canvasSnapshot.upsert({
    where: { projectId },
    create: {
      projectId,
      tldrawJson,
    },
    update: {
      tldrawJson,
    },
  });
}

export async function saveCanvasSnapshotFromDoc(
  projectId: string,
  doc: Y.Doc,
): Promise<void> {
  const records = readRecordsFromDoc(doc, projectId);
  await upsertCanvasSnapshot(projectId, records);
}
