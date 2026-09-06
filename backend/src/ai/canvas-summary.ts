import { docs } from "../canvas/yjs-ws-utils.js";
import { loadCanvasSnapshot, readRecordsFromDoc } from "../canvas/snapshot.js";

export async function readProjectCanvasRecords(
  projectId: string,
): Promise<Record<string, unknown>> {
  const liveDoc = docs.get(projectId);
  if (liveDoc) {
    return readRecordsFromDoc(liveDoc, projectId);
  }

  const snapshot = await loadCanvasSnapshot(projectId);
  return snapshot?.records ?? {};
}

export function summarizeCanvasRecords(
  records: Record<string, unknown>,
): string {
  const lines: string[] = [];

  for (const value of Object.values(records)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const record = value as Record<string, unknown>;

    if (record.typeName === "shape") {
      const type = typeof record.type === "string" ? record.type : "shape";
      const label = readShapeLabel(record);
      const id = typeof record.id === "string" ? record.id : "unknown";
      lines.push(label ? `${type}: ${label}` : `${type}: ${id}`);
      continue;
    }

    if (record.typeName === "binding") {
      const fromId = typeof record.fromId === "string" ? record.fromId : "unknown";
      const toId = typeof record.toId === "string" ? record.toId : "unknown";
      const terminal = readBindingTerminal(record);
      lines.push(
        terminal
          ? `connection ${fromId} ${terminal} ${toId}`
          : `connection ${fromId} -> ${toId}`,
      );
    }
  }

  if (lines.length === 0) {
    return "";
  }

  return lines.join("\n");
}

function readBindingTerminal(record: Record<string, unknown>): string | null {
  const props = record.props;
  if (!props || typeof props !== "object") {
    return null;
  }

  const terminal = (props as Record<string, unknown>).terminal;
  return typeof terminal === "string" ? terminal : null;
}

function readShapeLabel(record: Record<string, unknown>): string | null {
  const props = record.props;
  if (!props || typeof props !== "object") {
    return null;
  }

  const shapeProps = props as Record<string, unknown>;
  if (typeof shapeProps.text === "string" && shapeProps.text.trim()) {
    return shapeProps.text.trim();
  }

  return readRichText(shapeProps.richText);
}

function readRichText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const texts: string[] = [];
  collectText(value, texts);
  const label = texts.join(" ").trim();
  return label || null;
}

function collectText(value: unknown, texts: string[]): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectText(entry, texts);
    }
    return;
  }

  const node = value as Record<string, unknown>;
  if (typeof node.text === "string" && node.text.trim()) {
    texts.push(node.text.trim());
  }

  if (node.content) {
    collectText(node.content, texts);
  }
}
