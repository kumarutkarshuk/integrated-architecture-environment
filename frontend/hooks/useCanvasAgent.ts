"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { createCanvasAgentSession } from "../lib/canvas-agent/session";
import { createTldrawEditorPort } from "../lib/canvas-agent/tldraw-editor";
import {
  mountWebMcpRelayEmbed,
  registerCanvasReadTool,
} from "../lib/canvas-agent/webmcp";

export function useCanvasAgent(
  projectStatus: string | null,
  editor: Editor | null,
) {
  const [allowed, setAllowed] = useState(false);
  const allowedRef = useRef(allowed);
  const statusRef = useRef(projectStatus);
  const editorRef = useRef(editor);
  allowedRef.current = allowed;
  statusRef.current = projectStatus;
  editorRef.current = editor;

  const sessionRef = useRef(
    createCanvasAgentSession({
      getProjectStatus: () => statusRef.current,
      isAllowed: () => allowedRef.current,
      getEditor: () =>
        editorRef.current
          ? createTldrawEditorPort(editorRef.current)
          : null,
    }),
  );

  useEffect(() => {
    mountWebMcpRelayEmbed();
  }, []);

  const shouldRegister =
    sessionRef.current.shouldRegisterTools() && editor != null;
  useEffect(() => {
    if (!shouldRegister) {
      return;
    }

    const abort = new AbortController();
    void registerCanvasReadTool(sessionRef.current, abort.signal);
    return () => {
      abort.abort();
    };
  }, [shouldRegister]);

  return { allowed, setAllowed };
}
