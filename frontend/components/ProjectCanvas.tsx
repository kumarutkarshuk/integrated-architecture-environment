"use client";

import { Tldraw } from "tldraw";
import type { Editor, TLStoreWithStatus } from "tldraw";
import { TLDRAW_OPTIONS } from "../lib/canvas";
import "tldraw/tldraw.css";

interface ProjectCanvasProps {
  projectName: string;
  storeWithStatus: TLStoreWithStatus;
  onEditorReady: (editor: Editor) => void;
}

export function ProjectCanvas({
  projectName,
  storeWithStatus,
  onEditorReady,
}: ProjectCanvasProps) {
  if (storeWithStatus.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        Loading canvas for {projectName}...
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
      <Tldraw
        store={storeWithStatus.store}
        options={TLDRAW_OPTIONS}
        colorScheme="dark"
        onMount={onEditorReady}
      />
    </div>
  );
}
