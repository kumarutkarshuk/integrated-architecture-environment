"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import {
  applyAiPreview,
  fetchAiPreviews,
  regenerateAiPreview,
  type ApiAiPreview,
  type ApiProject,
} from "../lib/api";

export function useAiGeneration(
  project: ApiProject | null,
  refreshProject: (projectId: string) => Promise<ApiProject>,
  updateProjectInList: (project: ApiProject) => void,
) {
  const { getToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [previews, setPreviews] = useState<ApiAiPreview[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreviews = useCallback(async () => {
    if (!project || project.mode !== "prompt" || project.status === "ready") {
      setPreviews([]);
      return;
    }

    const token = await getToken();
    if (!token) {
      return;
    }

    const nextPreviews = await fetchAiPreviews(token, project.id);
    setPreviews(nextPreviews);
    setSelectedPreviewId((current) => current ?? nextPreviews[0]?.id ?? null);

    const latestPrompt = nextPreviews[0]?.prompt;
    if (latestPrompt) {
      setPrompt(latestPrompt);
    }
  }, [getToken, project]);

  useEffect(() => {
    if (!project || project.mode !== "prompt") {
      setPrompt("");
      setPreviews([]);
      setSelectedPreviewId(null);
    }
  }, [project?.id, project?.mode]);

  useEffect(() => {
    void loadPreviews().catch((loadError) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load previews",
      );
    });
  }, [loadPreviews, project?.status]);

  useEffect(() => {
    if (!project || project.status !== "generating") {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshProject(project.id)
        .then(updateProjectInList)
        .catch(() => undefined);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [project, refreshProject, updateProjectInList]);

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
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to regenerate preview",
      );
    } finally {
      setIsBusy(false);
    }
  }, [getToken, project, prompt, refreshProject, updateProjectInList]);

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
    selectedPreviewId,
    setSelectedPreviewId,
    isBusy,
    error,
    regenerate,
    applySelectedPreview,
  };
}
