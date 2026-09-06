"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAiJob,
  startExportSpec as startExportSpecRequest,
  type ApiProject,
} from "../lib/api";

export interface ExportedSpec {
  markdown: string;
  gaps_summary: string;
}

export function formatSpecFile(spec: ExportedSpec): string {
  return `${spec.markdown}\n\n---\n\n## Gaps summary\n\n${spec.gaps_summary}\n`;
}

function toDownloadFileName(projectName: string): string {
  const slug = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "project"}-spec.md`;
}

export function useExportSpec(project: ApiProject | null) {
  const { getToken } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [spec, setSpec] = useState<ExportedSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const projectIdRef = useRef<string | null>(project?.id ?? null);

  projectIdRef.current = project?.id ?? null;

  const canExport = project?.status === "ready";

  useEffect(() => {
    setIsExporting(false);
    setJobId(null);
    setSpec(null);
    setError(null);
  }, [project?.id]);

  useEffect(() => {
    if (!project || !jobId || !isExporting) {
      return;
    }

    const projectId = project.id;
    const activeJobId = jobId;

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const token = await getToken();
          if (!token) {
            return;
          }

          const job = await fetchAiJob(token, projectId, activeJobId);
          if (projectIdRef.current !== projectId) {
            return;
          }

          if (job.status === "completed") {
            const markdown = job.result?.markdown?.trim() ?? "";
            const gapsSummary = job.result?.gaps_summary?.trim() ?? "";

            if (!markdown || !gapsSummary) {
              setError("Export Spec result was incomplete");
              setIsExporting(false);
              setJobId(null);
              return;
            }

            setSpec({
              markdown,
              gaps_summary: gapsSummary,
            });
            setIsExporting(false);
            setJobId(null);
            return;
          }

          if (job.status === "failed") {
            setError("Export Spec failed");
            setIsExporting(false);
            setJobId(null);
          }
        } catch (pollError) {
          if (projectIdRef.current !== projectId) {
            return;
          }

          setError(
            pollError instanceof Error
              ? pollError.message
              : "Failed to poll Export Spec",
          );
          setIsExporting(false);
          setJobId(null);
        }
      })();
    }, 1500);

    return () => window.clearInterval(interval);
  }, [getToken, project, jobId, isExporting]);

  const exportSpec = useCallback(async () => {
    if (!project || project.status !== "ready") {
      return;
    }

    setIsExporting(true);
    setError(null);
    setSpec(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const job = await startExportSpecRequest(token, project.id);
      if (projectIdRef.current !== project.id) {
        return;
      }

      setJobId(job.id);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Failed to start Export Spec",
      );
      setIsExporting(false);
    }
  }, [getToken, project]);

  const clearSpec = useCallback(() => {
    setSpec(null);
    setError(null);
  }, []);

  const downloadSpec = useCallback(() => {
    if (!spec) {
      return;
    }

    const blob = new Blob([formatSpecFile(spec)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = toDownloadFileName(project?.name ?? "project");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [project?.name, spec]);

  const copySpec = useCallback(async () => {
    if (!spec) {
      return;
    }

    await navigator.clipboard.writeText(formatSpecFile(spec));
  }, [spec]);

  return {
    canExport,
    isExporting,
    spec,
    error,
    downloadFileName: toDownloadFileName(project?.name ?? "project"),
    exportSpec,
    clearSpec,
    downloadSpec,
    copySpec,
  };
}
