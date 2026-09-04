import { getYDoc } from "../canvas/yjs-ws-utils.js";
import {
  applyRecordsToDoc,
  upsertCanvasSnapshot,
} from "../canvas/snapshot.js";
import { prisma } from "../db.js";
import type { GenerateResult } from "./types.js";

export type ApplyPreviewError =
  | { code: "not_found"; status: 404 }
  | { code: "invalid_job"; status: 400; message: string };

export async function applyPreviewToCanvas(
  projectId: string,
  aiGenerationId: string,
): Promise<{ ok: true } | ApplyPreviewError> {
  const job = await prisma.aiGeneration.findFirst({
    where: {
      id: aiGenerationId,
      projectId,
    },
  });

  if (!job) {
    return { code: "not_found", status: 404 };
  }

  if (job.type !== "generate") {
    return {
      code: "invalid_job",
      status: 400,
      message: "Only generate previews can be applied",
    };
  }

  if (job.status !== "completed") {
    return {
      code: "invalid_job",
      status: 400,
      message: "Preview is not completed yet",
    };
  }

  if (job.appliedAt) {
    return {
      code: "invalid_job",
      status: 400,
      message: "Preview has already been applied",
    };
  }

  const result = job.result as GenerateResult | null;

  if (!result?.records || typeof result.records !== "object") {
    return {
      code: "invalid_job",
      status: 400,
      message: "Preview result is missing canvas records",
    };
  }

  const doc = getYDoc(projectId);
  applyRecordsToDoc(doc, projectId, result.records);
  await upsertCanvasSnapshot(projectId, result.records);

  await prisma.$transaction([
    prisma.aiGeneration.update({
      where: { id: aiGenerationId },
      data: { appliedAt: new Date() },
    }),
    prisma.project.update({
      where: { id: projectId },
      data: { status: "ready" },
    }),
  ]);

  return { ok: true };
}
