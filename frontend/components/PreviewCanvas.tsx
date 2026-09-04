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
import "tldraw/tldraw.css";

interface PreviewCanvasProps {
  records: Record<string, unknown>;
  label: string;
}

export function PreviewCanvas({ records, label }: PreviewCanvasProps) {
  const recordList = useMemo(
    () => Object.values(records) as TLRecord[],
    [records],
  );
  const pageId = useMemo(
    () =>
      (Object.keys(records).find((key) => key.startsWith("page:")) ??
        null) as TLPageId | null,
    [records],
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
        hideUi
        colorScheme="dark"
        onMount={(editor) => {
          editor.updateInstanceState({ isReadonly: true });
          if (pageId) {
            editor.setCurrentPage(pageId);
          }
          editor.zoomToFit({ animation: { duration: 0 } });
        }}
      />
    </div>
  );
}
