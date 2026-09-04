"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  type TLPageId,
  type TLRecord,
  type TLStoreWithStatus,
} from "tldraw";
import {
  CANVAS_PAGE_ID,
  normalizeCanvasRecords,
  TLDRAW_OPTIONS,
} from "../lib/canvas";
import "tldraw/tldraw.css";

interface PreviewCanvasProps {
  records: Record<string, unknown>;
  label: string;
}

export function PreviewCanvas({ records, label }: PreviewCanvasProps) {
  const normalizedRecords = useMemo(
    () => normalizeCanvasRecords(records),
    [records],
  );
  const recordList = useMemo(
    () => Object.values(normalizedRecords) as TLRecord[],
    [normalizedRecords],
  );
  const [storeWithStatus, setStoreWithStatus] =
    useState<TLStoreWithStatus | null>(null);

  useEffect(() => {
    if (recordList.length === 0) {
      setStoreWithStatus(null);
      return;
    }

    try {
      const store = createTLStore({
        shapeUtils: [...defaultShapeUtils],
      });
      store.put(recordList);
      setStoreWithStatus({ status: "synced-local", store });
    } catch (error) {
      setStoreWithStatus({
        status: "error",
        error:
          error instanceof Error
            ? error
            : new Error("Failed to load preview canvas"),
      });
    }
  }, [recordList]);

  if (!storeWithStatus) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        No preview records yet
      </div>
    );
  }

  if (storeWithStatus.status === "error") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-red-400">
        {storeWithStatus.error.message}
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute left-3 top-3 z-10 rounded bg-titlebar/90 px-2 py-1 text-xs text-muted">
        Preview: {label}
      </div>
      <Tldraw
        store={storeWithStatus.store}
        options={TLDRAW_OPTIONS}
        hideUi
        colorScheme="dark"
        onMount={(editor) => {
          editor.updateInstanceState({ isReadonly: true });
          editor.setCurrentPage(CANVAS_PAGE_ID as TLPageId);
          editor.zoomToFit({ animation: { duration: 0 } });
        }}
      />
    </div>
  );
}
