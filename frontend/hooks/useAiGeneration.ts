"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  applyAiPreview,
  hasAuthorRating,
  fetchAiPreviews,
  fetchAppliedAiGeneration,
  rateAiGeneration,
  regenerateAiPreview,
  type ApiAiPreview,
  type ApiProject,
  type RatingValue,
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
  liveCanvasReady = false,
) {
  const { getToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [previews, setPreviews] = useState<ApiAiPreview[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(
    null,
  );
  const [isBusy, setIsBusy] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [previewWaitTimedOut, setPreviewWaitTimedOut] = useState(false);
  const [appliedJob, setAppliedJob] = useState<ApiAiPreview | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);
  const projectRef = useRef(project);
  const loadPreviewsRef = useRef<() => Promise<void>>(async () => {});
  const selectNewestAfterRegenerateRef = useRef(false);

  useEffect(() => {
    activeProjectIdRef.current = project?.id ?? null;
  }, [project?.id]);

  projectRef.current = project;

  const loadPreviews = useCallback(
    async (options?: { selectNewest?: boolean }) => {
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
        const selectNewest =
          options?.selectNewest ?? selectNewestAfterRegenerateRef.current;
        setSelectedPreviewId((current) => {
          if (
            !selectNewest &&
            current &&
            nextPreviews.some((preview) => preview.id === current)
          ) {
            return current;
          }
          return nextPreviews[0]?.id ?? null;
        });
        if (selectNewest) {
          selectNewestAfterRegenerateRef.current = false;
          setIsRegenerating(false);
          setIsBusy(false);
        }

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
    },
    [getToken],
  );

  loadPreviewsRef.current = loadPreviews;

  useEffect(() => {
    if (!project || project.mode !== "prompt") {
      setPrompt("");
      setPreviews([]);
      setSelectedPreviewId(null);
      setAppliedJob(null);
      setPreviewWaitTimedOut(false);
      selectNewestAfterRegenerateRef.current = false;
      setIsRegenerating(false);
      setIsApplying(false);
      setIsBusy(false);
      return;
    }

    setPreviews([]);
    setSelectedPreviewId(null);
    setAppliedJob(null);
    setPreviewWaitTimedOut(false);
    selectNewestAfterRegenerateRef.current = false;
    setIsRegenerating(false);
    setIsApplying(false);
    setIsBusy(false);

    if (initialPrompt?.trim()) {
      setPrompt(initialPrompt.trim());
    }

    if (project.status === "preview") {
      void loadPreviewsRef.current();
    }
  }, [project?.id, project?.mode, initialPrompt]);

  useEffect(() => {
    if (
      !project ||
      project.mode !== "prompt" ||
      project.status !== "generating"
    ) {
      return;
    }

    const projectId = project.id;
    const poll = () => {
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
    };

    poll();
    const interval = window.setInterval(poll, 1500);

    return () => window.clearInterval(interval);
  }, [project?.id, project?.status, refreshProject, updateProjectInList]);

  const generationFailed = project?.status === "failed";
  const isGenerating = isRegenerating || project?.status === "generating";

  useEffect(() => {
    if (project?.status !== "failed") {
      return;
    }

    selectNewestAfterRegenerateRef.current = false;
    setIsRegenerating(false);
    setIsApplying(false);
    setIsBusy(false);
  }, [project?.id, project?.status]);

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
    setIsRegenerating(true);
    selectNewestAfterRegenerateRef.current = true;

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
        await loadPreviews({ selectNewest: true });
      }
    } catch (actionError) {
      selectNewestAfterRegenerateRef.current = false;
      setIsRegenerating(false);
      setIsBusy(false);
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to regenerate preview",
      );
    }
  }, [
    getToken,
    project,
    prompt,
    refreshProject,
    updateProjectInList,
    loadPreviews,
  ]);

  const applySelectedPreview = useCallback(async () => {
    if (!project || !selectedPreviewId || isApplying) {
      return;
    }

    setIsBusy(true);
    setIsApplying(true);

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
    } catch (actionError) {
      setIsApplying(false);
      setIsBusy(false);
      toast.error(
        actionError instanceof Error
          ? actionError.message
          : "Failed to apply preview",
      );
    }
  }, [getToken, isApplying, project, selectedPreviewId, updateProjectInList]);

  useEffect(() => {
    if (!isApplying || !liveCanvasReady) {
      return;
    }

    setIsApplying(false);
    setIsBusy(false);
    setPreviews([]);
    setSelectedPreviewId(null);
  }, [isApplying, liveCanvasReady]);

  useEffect(() => {
    if (
      !project ||
      project.mode !== "prompt" ||
      project.status !== "ready"
    ) {
      if (project?.status !== "ready") {
        setAppliedJob(null);
      }
      return;
    }

    const projectId = project.id;
    let cancelled = false;

    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) {
          return;
        }
        const job = await fetchAppliedAiGeneration(token, projectId);
        if (cancelled || activeProjectIdRef.current !== projectId) {
          return;
        }
        setAppliedJob(job);
      } catch (error) {
        if (cancelled || activeProjectIdRef.current !== projectId) {
          return;
        }
        if (
          error instanceof Error &&
          error.message === "Applied AI Generation not found"
        ) {
          setAppliedJob(null);
          return;
        }
        toast.error(
          error instanceof Error ? error.message : "Failed to load applied generation",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, project?.id, project?.mode, project?.status]);

  const rateJob = useCallback(
    async (jobId: string, value: RatingValue) => {
      if (!project) {
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const rated = await rateAiGeneration(token, project.id, jobId, value);
        setPreviews((current) =>
          current.map((preview) =>
            preview.id === jobId && hasAuthorRating(preview)
              ? { ...preview, rating: rated.value }
              : preview,
          ),
        );
        setAppliedJob((current) =>
          current?.id === jobId && hasAuthorRating(current)
            ? { ...current, rating: rated.value }
            : current,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save rating",
        );
      }
    },
    [getToken, project],
  );

  return {
    prompt,
    setPrompt,
    previews,
    selectedPreview,
    selectedPreviewId,
    setSelectedPreviewId,
    appliedJob,
    rateJob,
    isBusy,
    isApplying,
    isGenerating,
    generationFailed,
    previewWaitTimedOut,
    regenerate,
    applySelectedPreview,
    loadPreviews,
  };
}
