"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchAiJob,
  rateAiGeneration,
  startExportSpec as startExportSpecRequest,
  hasAuthorRating,
  type ApiAiJob,
  type ApiProject,
  type RatingValue,
} from "../lib/api";

export interface ExportedSpec {
  markdown: string;
  gaps_summary: string;
}

export function formatSpecFile(spec: ExportedSpec): string {
  return `${repairMarkdownTables(spec.markdown)}\n\n---\n\n## Gaps summary\n\n${spec.gaps_summary}\n`;
}

export function repairMarkdownTables(markdown: string): string {
  return markdown
    .split("\n")
    .flatMap((line) => splitCollapsedTableLine(line))
    .join("\n");
}

function splitCollapsedTableLine(line: string): string[] {
  const trimmed = line.trim();
  const separator = trimmed.match(/\|(?:\s*:?-{3,}:?\s*\|)+/);
  if (!separator || separator.index == null) {
    return [line];
  }

  const header = trimmed.slice(0, separator.index).trim();
  const rest = trimmed.slice(separator.index + separator[0].length).trim();
  if (!header.startsWith("|") || !rest.startsWith("|")) {
    return [line];
  }

  const colCount = Math.max(1, (separator[0].match(/\|/g) ?? []).length - 1);
  const cells = rest
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  const rows = [header, separator[0].trim()];
  for (let index = 0; index < cells.length; index += colCount) {
    const slice = cells.slice(index, index + colCount);
    if (slice.every((cell) => !cell)) {
      continue;
    }
    rows.push(`| ${slice.join(" | ")} |`);
  }
  return rows;
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
  const [specJob, setSpecJob] = useState<ApiAiJob | null>(null);
  const projectIdRef = useRef<string | null>(project?.id ?? null);

  projectIdRef.current = project?.id ?? null;

  const canExport = project?.status === "ready";

  useEffect(() => {
    setIsExporting(false);
    setJobId(null);
    setSpec(null);
    setSpecJob(null);
  }, [project?.id]);

  useEffect(() => {
    if (!project || !jobId || !isExporting) {
      return;
    }

    const projectId = project.id;
    const activeJobId = jobId;
    let cancelled = false;

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const token = await getToken();
          if (!token || cancelled) {
            return;
          }

          const job = await fetchAiJob(token, projectId, activeJobId);
          if (cancelled || projectIdRef.current !== projectId) {
            return;
          }

          if (job.status === "completed") {
            const markdown = job.result?.markdown?.trim() ?? "";
            const gapsSummary = job.result?.gaps_summary?.trim() ?? "";

            if (!markdown || !gapsSummary) {
              toast.error("Export Spec result was incomplete");
              setIsExporting(false);
              setJobId(null);
              return;
            }

            setSpec({
              markdown,
              gaps_summary: gapsSummary,
            });
            setSpecJob(job);
            setIsExporting(false);
            setJobId(null);
            return;
          }

            if (job.status === "failed") {
              toast.error(job.error?.trim() || "Export Spec failed");
            setIsExporting(false);
            setJobId(null);
          }
        } catch (pollError) {
          if (cancelled || projectIdRef.current !== projectId) {
            return;
          }

          toast.error(
            pollError instanceof Error
              ? pollError.message
              : "Failed to poll Export Spec",
          );
          setIsExporting(false);
          setJobId(null);
        }
      })();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [getToken, project, jobId, isExporting]);

  const exportSpec = useCallback(async () => {
    if (!project || project.status !== "ready") {
      return;
    }

    setIsExporting(true);
    setSpec(null);
    setSpecJob(null);

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
      toast.error(
        startError instanceof Error
          ? startError.message
          : "Failed to start Export Spec",
      );
      setIsExporting(false);
    }
  }, [getToken, project]);

  const clearSpec = useCallback(() => {
    setSpec(null);
    setSpecJob(null);
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

  const rateSpec = useCallback(
    async (value: RatingValue) => {
      if (!project || !specJob || !hasAuthorRating(specJob)) {
        return;
      }

      const previous = specJob.rating;
      setSpecJob((current) =>
        current && hasAuthorRating(current)
          ? { ...current, rating: value }
          : current,
      );

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const rated = await rateAiGeneration(
          token,
          project.id,
          specJob.id,
          value,
        );
        setSpecJob((current) =>
          current && hasAuthorRating(current)
            ? { ...current, rating: rated.value }
            : current,
        );
      } catch (error) {
        setSpecJob((current) =>
          current && hasAuthorRating(current)
            ? { ...current, rating: previous }
            : current,
        );
        toast.error(
          error instanceof Error ? error.message : "Failed to save rating",
        );
      }
    },
    [getToken, project, specJob],
  );

  return {
    canExport,
    isExporting,
    spec,
    specJob,
    downloadFileName: toDownloadFileName(project?.name ?? "project"),
    exportSpec,
    clearSpec,
    downloadSpec,
    copySpec,
    rateSpec,
  };
}
