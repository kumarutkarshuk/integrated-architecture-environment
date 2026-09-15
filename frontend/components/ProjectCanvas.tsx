"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import type { Editor, TLStoreWithStatus } from "tldraw";
import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";
import { TLDRAW_LICENSE_KEY, TLDRAW_OPTIONS } from "../lib/canvas";
import "tldraw/tldraw.css";

function applyReadOnly(editor: Editor | null, readOnly: boolean) {
  editor?.updateInstanceState({ isReadonly: readOnly });
}

export function CanvasLoadingPing({
  label = "Loading canvas...",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs font-mono"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 text-sky-400">
        <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />
        <p className="text-muted">{label}</p>
      </div>
    </div>
  );
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
    return <CanvasLoadingPing label={`Loading canvas for ${projectName}...`} />;
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
        licenseKey={TLDRAW_LICENSE_KEY}
        colorScheme="dark"
        onMount={handleMount}
      />
    </div>
  );
}
