"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  applyAiPreview,
  hasAuthorRating,
  fetchAiPreviews,
  fetchAppliedAiGeneration,
  fetchLatestAiGeneration,
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

const GENERATE_FAILED_MESSAGE = "Generation failed. Please try again.";

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
  const [appliedJobSourceId, setAppliedJobSourceId] = useState<string | null>(
    null,
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);
  const projectRef = useRef(project);
  const loadPreviewsRef = useRef<() => Promise<void>>(async () => {});
  const selectNewestAfterRegenerateRef = useRef(false);
  const failureToastForJobRef = useRef<string | null>(null);
  const promptProjectIdRef = useRef<string | null>(null);
  const regenerateInFlightRef = useRef(false);

  useEffect(() => {
    activeProjectIdRef.current = project?.id ?? null;
    failureToastForJobRef.current = null;
    promptProjectIdRef.current = null;
    regenerateInFlightRef.current = false;
    setGenerationError(null);
  }, [project?.id]);

  projectRef.current = project;

  const loadPreviews = useCallback(
    async (options?: { selectNewest?: boolean }) => {
      const currentProject = projectRef.current;
      if (
        !currentProject ||
        currentProject.mode !== "prompt" ||
        (currentProject.status !== "preview" &&
          currentProject.status !== "failed")
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
          promptProjectIdRef.current = projectId;
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

  const readLatestGenerateFailure = useCallback(
    async (projectId: string, toastOnFail: boolean) => {
      try {
        const token = await getToken();
        if (!token || activeProjectIdRef.current !== projectId) {
          return;
        }

        const latest = await fetchLatestAiGeneration(token, projectId);
        if (activeProjectIdRef.current !== projectId) {
          return;
        }

        if (latest.status !== "failed") {
          setGenerationError(null);
          return;
        }

        if (
          latest.prompt?.trim() &&
          promptProjectIdRef.current !== projectId
        ) {
          promptProjectIdRef.current = projectId;
          setPrompt(latest.prompt.trim());
        }

        const message = latest.error?.trim() || GENERATE_FAILED_MESSAGE;
        setGenerationError(message);
        if (toastOnFail && failureToastForJobRef.current !== latest.id) {
          failureToastForJobRef.current = latest.id;
          toast.error(message);
        }
      } catch (latestError) {
        if (
          activeProjectIdRef.current !== projectId ||
          isProjectNotFoundError(latestError)
        ) {
          return;
        }
        if (toastOnFail) {
          toast.error(GENERATE_FAILED_MESSAGE);
        }
        setGenerationError(GENERATE_FAILED_MESSAGE);
      }
    },
    [getToken],
  );

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
    setPrompt(initialPrompt?.trim() ?? "");
    if (initialPrompt?.trim()) {
      promptProjectIdRef.current = project.id;
    }

    if (project.status === "preview" || project.status === "failed") {
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
        .then(async (updated) => {
          if (activeProjectIdRef.current !== projectId) {
            return;
          }
          updateProjectInList(updated);
          if (updated.status === "generating") {
            return;
          }
          if (updated.status === "failed" || updated.status === "preview") {
            await readLatestGenerateFailure(projectId, true);
          }
          if (updated.status === "failed") {
            selectNewestAfterRegenerateRef.current = false;
            setIsRegenerating(false);
            setIsBusy(false);
            projectRef.current = updated;
            await loadPreviewsRef.current();
            return;
          }
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
  }, [
    project?.id,
    project?.status,
    refreshProject,
    updateProjectInList,
    readLatestGenerateFailure,
  ]);

  const generationFailed = project?.status === "failed";
  const isGenerating = isRegenerating || project?.status === "generating";

  useEffect(() => {
    if (
      !project ||
      project.mode !== "prompt" ||
      (project.status !== "failed" && project.status !== "preview")
    ) {
      return;
    }

    if (project.status === "failed") {
      selectNewestAfterRegenerateRef.current = false;
      setIsRegenerating(false);
      setIsApplying(false);
      setIsBusy(false);
    }
    void readLatestGenerateFailure(project.id, false);
  }, [project?.id, project?.mode, project?.status, readLatestGenerateFailure]);

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
    if (
      !project ||
      !prompt.trim() ||
      regenerateInFlightRef.current ||
      isRegenerating
    ) {
      return;
    }

    regenerateInFlightRef.current = true;
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
      const message =
        actionError instanceof Error
          ? actionError.message
          : "Failed to regenerate preview";
      setGenerationError(message);
      toast.error(message);
    } finally {
      regenerateInFlightRef.current = false;
    }
  }, [
    getToken,
    isRegenerating,
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
      setAppliedJobSourceId(null);
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
      } finally {
        if (!cancelled && activeProjectIdRef.current === projectId) {
          setAppliedJobSourceId(projectId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, project?.id, project?.mode, project?.status]);

  const isAppliedJobLoading = Boolean(
    project &&
      project.mode === "prompt" &&
      project.status === "ready" &&
      appliedJobSourceId !== project.id,
  );

  const rateJob = useCallback(
    async (jobId: string, value: RatingValue) => {
      if (!project) {
        return;
      }

      const previousPreview = previews.find((preview) => preview.id === jobId);
      const previousRating = hasAuthorRating(previousPreview)
        ? previousPreview.rating
        : appliedJob?.id === jobId && hasAuthorRating(appliedJob)
          ? appliedJob.rating
          : undefined;

      const applyLocalRating = (next: RatingValue | null) => {
        setPreviews((current) =>
          current.map((preview) =>
            preview.id === jobId && hasAuthorRating(preview)
              ? { ...preview, rating: next }
              : preview,
          ),
        );
        setAppliedJob((current) =>
          current?.id === jobId && hasAuthorRating(current)
            ? { ...current, rating: next }
            : current,
        );
      };

      applyLocalRating(value);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const rated = await rateAiGeneration(token, project.id, jobId, value);
        applyLocalRating(rated.value);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save rating",
        );
        try {
          const token = await getToken();
          if (!token || activeProjectIdRef.current !== project.id) {
            throw new Error("Missing auth token");
          }
          if (project.status === "ready") {
            const job = await fetchAppliedAiGeneration(token, project.id);
            if (activeProjectIdRef.current !== project.id) {
              return;
            }
            setAppliedJob(job);
          } else {
            await loadPreviews();
          }
        } catch {
          if (previousRating !== undefined) {
            applyLocalRating(previousRating);
          }
        }
      }
    },
    [appliedJob, getToken, loadPreviews, previews, project],
  );

  return {
    prompt,
    setPrompt,
    previews,
    selectedPreview,
    selectedPreviewId,
    setSelectedPreviewId,
    appliedJob,
    isAppliedJobLoading,
    rateJob,
    isBusy,
    isApplying,
    isGenerating,
    generationFailed,
    generationError,
    previewWaitTimedOut,
    regenerate,
    applySelectedPreview,
    loadPreviews,
  };
}
