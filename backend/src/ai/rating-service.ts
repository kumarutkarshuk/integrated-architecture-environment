import { notDeleted, prisma } from "../db.js";

export type RatingValue = "up" | "down";

const jobSelect = {
  id: true,
  type: true,
  prompt: true,
  status: true,
  result: true,
  model: true,
  promptVersion: true,
  provider: true,
  appliedAt: true,
  createdAt: true,
  error: true,
  blockedBy: true,
  userId: true,
} as const;

const jobDetailSelect = {
  ...jobSelect,
  plan: true,
} as const;

export const publicJobSelect = jobSelect;
export const publicJobDetailSelect = jobDetailSelect;

type JobRow = {
  id: string;
  userId: string;
};

export function parseRatingValue(value: unknown): RatingValue | null {
  if (value === "up" || value === "down") {
    return value;
  }
  return null;
}

export async function presentJobsForViewer<T extends JobRow>(
  jobs: T[],
  viewerId: string,
): Promise<Array<Omit<T, "userId"> & { rating?: RatingValue | null }>> {
  const authorJobIds = jobs
    .filter((job) => job.userId === viewerId)
    .map((job) => job.id);

  const ratings =
    authorJobIds.length === 0
      ? []
      : await prisma.rating.findMany({
          where: {
            userId: viewerId,
            aiGenerationId: { in: authorJobIds },
            ...notDeleted,
          },
          select: { aiGenerationId: true, value: true },
        });

  const ratingByJobId = new Map(
    ratings.map((row) => [row.aiGenerationId, row.value as RatingValue]),
  );

  return jobs.map((job) => {
    const { userId: _userId, ...publicJob } = job;
    if (job.userId !== viewerId) {
      return publicJob;
    }
    return {
      ...publicJob,
      rating: ratingByJobId.get(job.id) ?? null,
    };
  });
}

export async function presentJobForViewer<T extends JobRow>(
  job: T,
  viewerId: string,
): Promise<Omit<T, "userId"> & { rating?: RatingValue | null }> {
  const [presented] = await presentJobsForViewer([job], viewerId);
  return presented!;
}

export async function upsertAuthorRating(options: {
  projectId: string;
  jobId: string;
  userId: string;
  value: RatingValue;
}): Promise<
  | { ok: true; value: RatingValue }
  | { ok: false; status: 400 | 403 | 404; error: string }
> {
  const job = await prisma.aiGeneration.findFirst({
    where: {
      id: options.jobId,
      projectId: options.projectId,
      ...notDeleted,
    },
    select: { id: true, userId: true, status: true },
  });

  if (!job) {
    return { ok: false, status: 404, error: "AI Generation job not found" };
  }

  if (job.userId !== options.userId) {
    return { ok: false, status: 403, error: "Only the author can rate this AI Generation" };
  }

  if (job.status !== "completed") {
    return { ok: false, status: 400, error: "Only a completed AI Generation can be rated" };
  }

  await prisma.rating.upsert({
    where: {
      aiGenerationId_userId: {
        aiGenerationId: job.id,
        userId: options.userId,
      },
    },
    create: {
      aiGenerationId: job.id,
      userId: options.userId,
      value: options.value,
    },
    update: {
      value: options.value,
      deletedAt: null,
    },
  });

  return { ok: true, value: options.value };
}

export async function findAppliedGenerateJob(projectId: string) {
  return prisma.aiGeneration.findFirst({
    where: {
      projectId,
      type: "generate",
      appliedAt: { not: null },
      ...notDeleted,
    },
    orderBy: { appliedAt: "desc" },
    select: jobSelect,
  });
}

export async function findLatestGenerateJob(projectId: string) {
  return prisma.aiGeneration.findFirst({
    where: {
      projectId,
      type: "generate",
      ...notDeleted,
    },
    orderBy: { createdAt: "desc" },
    select: jobSelect,
  });
}
