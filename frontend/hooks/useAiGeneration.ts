"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyAiPreview,
  fetchAiActiveJob,
  fetchAiPreviews,
  regenerateAiPreview,
  type ApiAiActiveJob,
  type ApiAiPreview,
  type ApiProject,
} from "../lib/api";

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
  const [activeJob, setActiveJob] = useState<ApiAiActiveJob | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeProjectIdRef.current = project?.id ?? null;
  }, [project?.id]);

  const loadPreviews = useCallback(async () => {
    if (!project || project.mode !== "prompt" || project.status === "ready") {
      setPreviews([]);
      setSelectedPreviewId(null);
      setActiveJob(null);
      return;
    }

    const projectId = project.id;

    try {
      const token = await getToken();
      if (!token) {
        return;
      }

      const [nextPreviews, nextActiveJob] = await Promise.all([
        fetchAiPreviews(token, projectId),
        fetchAiActiveJob(token, projectId),
      ]);
      if (activeProjectIdRef.current !== projectId) {
        return;
      }

      setPreviews(nextPreviews);
      setActiveJob(nextActiveJob);
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
        setActiveJob(null);
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load previews",
      );
    }
  }, [getToken, project]);

  useEffect(() => {
    if (!project || project.mode !== "prompt") {
      setPrompt("");
      setPreviews([]);
      setSelectedPreviewId(null);
      setActiveJob(null);
      return;
    }

    setPreviews([]);
    setSelectedPreviewId(null);
    setActiveJob(null);
    setError(null);

    if (initialPrompt?.trim()) {
      setPrompt(initialPrompt.trim());
    }

    void loadPreviews();
  }, [project?.id, project?.mode, initialPrompt, loadPreviews]);

  useEffect(() => {
    if (!project || project.status === "ready") {
      return;
    }

    const activeJobStatus = activeJob?.status;
    const isJobInFlight =
      activeJobStatus === "pending" || activeJobStatus === "running";

    if (project.status === "preview" && previews.length > 0) {
      return;
    }

    if (!isJobInFlight && activeJobStatus === "failed" && previews.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshProject(project.id)
        .then((updated) => {
          if (activeProjectIdRef.current !== project.id) {
            return;
          }
          updateProjectInList(updated);
          return loadPreviews();
        })
        .catch((pollError) => {
          if (isProjectNotFoundError(pollError)) {
            return;
          }
        });
    }, 1500);

    return () => window.clearInterval(interval);
  }, [
    project,
    previews.length,
    activeJob?.status,
    refreshProject,
    updateProjectInList,
    loadPreviews,
  ]);

  const generationFailed =
    activeJob?.status === "failed" && previews.length === 0;
  const isGenerating =
    project?.status === "generating" &&
    (activeJob?.status === "pending" ||
      activeJob?.status === "running" ||
      !activeJob);

  const selectedPreview = useMemo(
    () => previews.find((preview) => preview.id === selectedPreviewId) ?? null,
    [previews, selectedPreviewId],
  );

  const regenerate = useCallback(async () => {
    if (!project || !prompt.trim()) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      await regenerateAiPreview(token, project.id, prompt.trim());
      const updated = await refreshProject(project.id);
      updateProjectInList(updated);
      await loadPreviews();
    } catch (actionError) {
      setError(
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
    setError(null);

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
      setError(
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
    activeJob,
    selectedPreview,
    selectedPreviewId,
    setSelectedPreviewId,
    isBusy,
    isGenerating,
    generationFailed,
    error,
    regenerate,
    applySelectedPreview,
    loadPreviews,
  };
}
