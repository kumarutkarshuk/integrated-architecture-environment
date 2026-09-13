"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { createBrowserArmBus, type ArmBus } from "../lib/canvas-agent/arm-bus";
import { createCanvasAgentSession } from "../lib/canvas-agent/session";
import { createTldrawEditorPort } from "../lib/canvas-agent/tldraw-editor";
import {
  mountWebMcpRelayEmbed,
  registerCanvasReadTool,
} from "../lib/canvas-agent/webmcp";

export type ArmConflict = {
  thisProjectName: string;
  otherProjectName: string;
};

export type ArmConflictChoice = "keep" | "switch" | "cancel";

export function useCanvasAgent(
  projectStatus: string | null,
  editor: Editor | null,
  project: { id: string; name: string } | null,
) {
  const [allowed, setAllowedState] = useState(false);
  const [armConflict, setArmConflict] = useState<ArmConflict | null>(null);
  const statusRef = useRef(projectStatus);
  const editorRef = useRef(editor);
  const projectRef = useRef(project);
  statusRef.current = projectStatus;
  editorRef.current = editor;
  projectRef.current = project;

  const busRef = useRef<ArmBus | null>(null);
  if (busRef.current === null) {
    busRef.current = createBrowserArmBus();
  }
  const armBus = busRef.current;

  const sessionRef = useRef(
    createCanvasAgentSession({
      getProjectStatus: () => statusRef.current,
      getEditor: () =>
        editorRef.current
          ? createTldrawEditorPort(editorRef.current)
          : null,
      armBus,
    }),
  );

  useEffect(() => {
    mountWebMcpRelayEmbed();
  }, []);

  useEffect(() => {
    setAllowedState(armBus.hasClaim());
    return armBus.subscribe(() => {
      setAllowedState(armBus.hasClaim());
    });
  }, [armBus]);

  useEffect(() => {
    return () => {
      armBus.release();
    };
  }, [armBus]);

  const projectId = project?.id ?? null;
  const projectName = project?.name ?? null;

  useEffect(() => {
    if (!projectId || !projectName || !armBus.hasClaim()) {
      return;
    }
    armBus.claim({ id: projectId, name: projectName });
  }, [armBus, projectId, projectName]);

  const requestAllowed = useCallback(
    (next: boolean) => {
      if (!next) {
        armBus.release();
        setAllowedState(false);
        setArmConflict(null);
        return;
      }

      const current = projectRef.current;
      if (!current) {
        return;
      }

      const result = armBus.claim(current);
      if (result.ok) {
        setAllowedState(true);
        setArmConflict(null);
        return;
      }

      setArmConflict({
        thisProjectName: current.name,
        otherProjectName: result.holder.projectName,
      });
    },
    [armBus],
  );

  const resolveArmConflict = useCallback(
    (choice: ArmConflictChoice) => {
      const current = projectRef.current;
      if (choice === "switch" && current) {
        armBus.takeOver(current);
        setAllowedState(true);
      }
      setArmConflict(null);
    },
    [armBus],
  );

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

  return { allowed, requestAllowed, armConflict, resolveArmConflict };
}
