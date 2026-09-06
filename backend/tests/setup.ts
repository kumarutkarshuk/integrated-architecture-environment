import { prisma } from "../src/db.js";
import { clearCanvasPersistenceTimers } from "../src/canvas/persistence.js";
import { configureExportSpecService } from "../src/ai/export-spec-service.js";
import { configureGenerateService } from "../src/ai/generate-service.js";
import {
  createMemoryAiRateLimiter,
  resetAiRateLimiter,
  setAiRateLimiter,
} from "../src/ai/rate-limit.js";

configureGenerateService({
  groqModel: "openai/gpt-oss-20b",
  isTest: true,
});

configureExportSpecService({
  groqModel: "openai/gpt-oss-20b",
  isTest: true,
});

const testAiRateLimiter = createMemoryAiRateLimiter();

beforeEach(async () => {
  testAiRateLimiter.reset();
  setAiRateLimiter(testAiRateLimiter.limiter);
  clearCanvasPersistenceTimers();
  await prisma.aiGeneration.deleteMany();
  await prisma.canvasSnapshot.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  resetAiRateLimiter();
  await prisma.$disconnect();
});
