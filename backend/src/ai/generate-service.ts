import { prisma } from "../db.js";
import { buildFixtureGenerateResult } from "./fixture.js";
import type { GenerateResult } from "./types.js";

export async function createGenerateJob(
  projectId: string,
  userId: string,
  prompt: string,
) {
  return prisma.aiGeneration.create({
    data: {
      projectId,
      userId,
      type: "generate",
      status: "pending",
      prompt: prompt.trim(),
    },
  });
}

export async function runGenerateJob(aiGenerationId: string): Promise<void> {
  const job = await prisma.aiGeneration.findUnique({
    where: { id: aiGenerationId },
    include: { project: true },
  });

  if (!job || job.type !== "generate" || job.status !== "pending") {
    return;
  }

  await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: { status: "running" },
  });

  try {
    const result = await produceGenerateResult(job.prompt ?? "");
    await completeGenerateJob(aiGenerationId, result);
  } catch (error) {
    console.error("Generate job failed", aiGenerationId, error);
    await prisma.aiGeneration.update({
      where: { id: aiGenerationId },
      data: { status: "failed" },
    });
  }
}

async function produceGenerateResult(prompt: string): Promise<GenerateResult> {
  return buildFixtureGenerateResult(prompt);
}

export async function completeGenerateJob(
  aiGenerationId: string,
  result: GenerateResult,
): Promise<void> {
  const job = await prisma.aiGeneration.update({
    where: { id: aiGenerationId },
    data: {
      status: "completed",
      result: result as object,
    },
    include: { project: true },
  });

  await prisma.project.update({
    where: { id: job.projectId },
    data: { status: "preview" },
  });
}
