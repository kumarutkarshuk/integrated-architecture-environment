"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";
import { createBrowserArmBus, type ArmBus } from "../lib/canvas-agent/arm-bus";
import { createCanvasAgentSession } from "../lib/canvas-agent/session";
import { createTldrawEditorPort } from "../lib/canvas-agent/tldraw-editor";
import {
  mountWebMcpRelayEmbed,
  registerCanvasAgentTools,
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
  onAgentCursor?: (cursor: { x: number; y: number }) => void,
) {
  const [allowed, setAllowedState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setArmedTabIds] = useState("");
  const [armConflict, setArmConflict] = useState<ArmConflict | null>(null);
  const statusRef = useRef(projectStatus);
  const editorRef = useRef(editor);
  const projectRef = useRef(project);
  const onAgentCursorRef = useRef(onAgentCursor);
  statusRef.current = projectStatus;
  editorRef.current = editor;
  projectRef.current = project;
  onAgentCursorRef.current = onAgentCursor;

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
      onAgentCursor: (cursor) => {
        onAgentCursorRef.current?.(cursor);
      },
    }),
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(mountWebMcpRelayEmbed()).finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncAllowed = () => {
      setAllowedState(armBus.hasClaim());
      setArmedTabIds(
        armBus
          .listArmed()
          .map((claim) => claim.tabId)
          .sort()
          .join(","),
      );
    };
    syncAllowed();
    return armBus.subscribe(syncAllowed);
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
    const session = sessionRef.current;
    setIsLoading(true);
    void (async () => {
      await session.syncArms();
      if (abort.signal.aborted || !session.shouldRegisterTools()) {
        if (!abort.signal.aborted) {
          setIsLoading(false);
        }
        return;
      }
      await registerCanvasAgentTools(session, abort.signal);
      if (!abort.signal.aborted) {
        setIsLoading(false);
      }
    })();
    return () => {
      abort.abort();
    };
  }, [shouldRegister]);

  return { allowed, isLoading, requestAllowed, armConflict, resolveArmConflict };
}
