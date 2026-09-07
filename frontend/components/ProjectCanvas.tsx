"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import type { Editor, TLStoreWithStatus } from "tldraw";
import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";
import { TLDRAW_OPTIONS } from "../lib/canvas";
import "tldraw/tldraw.css";

function applyReadOnly(editor: Editor | null, readOnly: boolean) {
  editor?.updateInstanceState({ isReadonly: readOnly });
}

interface ProjectCanvasProps {
  projectName: string;
  storeWithStatus: TLStoreWithStatus;
  saveStatus: CanvasSaveStatus;
  onEditorReady: (editor: Editor) => void;
}

export function ProjectCanvas({
  projectName,
  storeWithStatus,
  saveStatus,
  onEditorReady,
}: ProjectCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const readOnly = saveStatus === "offline";
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  useEffect(() => {
    applyReadOnly(editorRef.current, readOnly);
  }, [readOnly]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      applyReadOnly(editor, readOnlyRef.current);
      onEditorReady(editor);
    },
    [onEditorReady],
  );

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
    <div className="relative z-0 isolate min-h-0 flex-1">
      <Tldraw
        store={storeWithStatus.store}
        options={TLDRAW_OPTIONS}
        colorScheme="dark"
        onMount={handleMount}
      />
    </div>
  );
}
