"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  applyAiPreview,
  fetchAiPreviews,
  regenerateAiPreview,
  type ApiAiPreview,
  type ApiProject,
} from "../lib/api";
import { PREVIEW_LOAD_TIMEOUT_MS } from "../lib/canvas";

function isProjectNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === "Project not found";
}

export function useAiGeneration(
  project: ApiProject | null,
  refreshProject: (projectId: string) => Promise<ApiProject>,
  updateProjectInList: (project: ApiProject) => void,
  initialPrompt?: string | null,
) {
  const { getToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [previews, setPreviews] = useState<ApiAiPreview[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);
  const [previewWaitTimedOut, setPreviewWaitTimedOut] = useState(false);
  const activeProjectIdRef = useRef<string | null>(null);
  const projectRef = useRef(project);
  const loadPreviewsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    activeProjectIdRef.current = project?.id ?? null;
  }, [project?.id]);

  projectRef.current = project;

  const loadPreviews = useCallback(async () => {
    const currentProject = projectRef.current;
    if (
      !currentProject ||
      currentProject.mode !== "prompt" ||
      currentProject.status !== "preview"
    ) {
      return;
    }

    const projectId = currentProject.id;

    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      const nextPreviews = await fetchAiPreviews(token, projectId);
      if (activeProjectIdRef.current !== projectId) {
        return;
      }

      setPreviews(nextPreviews);
      setPreviewWaitTimedOut(false);
      setSelectedPreviewId((current) => {
        if (current && nextPreviews.some((preview) => preview.id === current)) {
          return current;
        }
        return nextPreviews[0]?.id ?? null;
      });

      const latestPrompt = nextPreviews[0]?.prompt;
      if (latestPrompt) {
        setPrompt(latestPrompt);
      }
    } catch (loadError) {
      if (activeProjectIdRef.current !== projectId) {
        return;
      }

      if (isProjectNotFoundError(loadError)) {
        setPreviews([]);
        setSelectedPreviewId(null);
        return;
      }

      toast.error(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load previews",
      );
    }
  }, [getToken]);

  loadPreviewsRef.current = loadPreviews;

  useEffect(() => {
    if (!project || project.mode !== "prompt") {
      setPrompt("");
      setPreviews([]);
      setSelectedPreviewId(null);
      setPreviewWaitTimedOut(false);
      return;
    }

    setPreviews([]);
    setSelectedPreviewId(null);
    setPreviewWaitTimedOut(false);

    if (initialPrompt?.trim()) {
      setPrompt(initialPrompt.trim());
    }

    if (project.status === "preview") {
      void loadPreviewsRef.current();
    }
  }, [project?.id, project?.mode, initialPrompt]);

  useEffect(() => {
    if (!project || project.mode !== "prompt" || project.status !== "generating") {
      return;
    }

    const projectId = project.id;
    const interval = window.setInterval(() => {
      void refreshProject(projectId)
        .then((updated) => {
          if (activeProjectIdRef.current !== projectId) {
            return;
          }
          updateProjectInList(updated);
          if (updated.status === "preview") {
            projectRef.current = updated;
            return loadPreviewsRef.current();
          }
        })
        .catch((pollError) => {
          if (isProjectNotFoundError(pollError)) {
            return;
          }
        });
    }, 1500);

    return () => window.clearInterval(interval);
  }, [project?.id, project?.status, refreshProject, updateProjectInList]);

  const generationFailed = project?.status === "failed";
  const isGenerating = project?.status === "generating";

  const selectedPreview = useMemo(
    () => previews.find((preview) => preview.id === selectedPreviewId) ?? null,
    [previews, selectedPreviewId],
  );

  useEffect(() => {
    if (
      !project ||
      project.mode !== "prompt" ||
      project.status !== "preview" ||
      selectedPreview?.result?.records
    ) {
      return;
    }

    const projectId = project.id;
    const timer = window.setTimeout(() => {
      if (activeProjectIdRef.current !== projectId) {
        return;
      }

      setPreviewWaitTimedOut(true);
    }, PREVIEW_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [
    project?.id,
    project?.mode,
    project?.status,
    selectedPreview?.result?.records,
  ]);

  const regenerate = useCallback(async () => {
    if (!project || !prompt.trim()) {
      return;
    }

    setPreviewWaitTimedOut(false);
    setIsBusy(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      await regenerateAiPreview(token, project.id, prompt.trim());
      const updated = await refreshProject(project.id);
      updateProjectInList(updated);
      if (updated.status === "preview") {
        projectRef.current = updated;
        await loadPreviews();
      }
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to regenerate preview",
      );
    } finally {
      setIsBusy(false);
    }
  }, [getToken, project, prompt, refreshProject, updateProjectInList, loadPreviews]);

  const applySelectedPreview = useCallback(async () => {
    if (!project || !selectedPreviewId) {
      return;
    }

    setIsBusy(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const updated = await applyAiPreview(
        token,
        project.id,
        selectedPreviewId,
      );
      updateProjectInList(updated);
      setPreviews([]);
      setSelectedPreviewId(null);
    } catch (actionError) {
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to apply preview",
      );
    } finally {
      setIsBusy(false);
    }
  }, [getToken, project, selectedPreviewId, updateProjectInList]);

  return {
    prompt,
    setPrompt,
    previews,
    selectedPreview,
    selectedPreviewId,
    setSelectedPreviewId,
    isBusy,
    isGenerating,
    generationFailed,
    previewWaitTimedOut,
    regenerate,
    applySelectedPreview,
    loadPreviews,
  };
}
