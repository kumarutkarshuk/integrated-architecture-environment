import { clearCanvasPersistenceTimer } from "../canvas/persistence.js";
import { normalizeCanvasRecords } from "../canvas/records.js";
import { upsertCanvasSnapshot } from "../canvas/snapshot.js";
import { teardownCanvasDoc } from "../canvas/yjs-ws-utils.js";
import { lockLiveProject, prisma } from "../db.js";
import type { GenerateResult } from "./types.js";

export type ApplyPreviewError =
  | { code: "not_found"; status: 404 }
  | { code: "invalid_job"; status: 400; message: string };

class ApplyPreviewConflict extends Error {
  constructor(readonly error: ApplyPreviewError) {
    super(error.code);
    this.name = "ApplyPreviewConflict";
  }
}

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

  const normalizedRecords = normalizeCanvasRecords(result.records);

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await lockLiveProject(tx, projectId);
      if (!locked) {
        throw new ApplyPreviewConflict({ code: "not_found", status: 404 });
      }

      const claimed = await tx.aiGeneration.updateMany({
        where: {
          id: aiGenerationId,
          projectId,
          type: "generate",
          status: "completed",
          appliedAt: null,
        },
        data: { appliedAt: new Date() },
      });

      if (claimed.count === 0) {
        throw new ApplyPreviewConflict({
          code: "invalid_job",
          status: 400,
          message: "Preview has already been applied",
        });
      }

      const saved = await upsertCanvasSnapshot(projectId, normalizedRecords, tx);
      if (!saved) {
        throw new ApplyPreviewConflict({ code: "not_found", status: 404 });
      }

      await tx.project.updateMany({
        where: { id: projectId, deletedAt: null },
        data: { status: "ready" },
      });
    });
  } catch (error) {
    if (error instanceof ApplyPreviewConflict) {
      return error.error;
    }
    throw error;
  }

  clearCanvasPersistenceTimer(projectId);
  teardownCanvasDoc(projectId);

  return { ok: true };
}
