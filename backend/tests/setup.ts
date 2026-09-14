import { resetAnalytics } from "../src/analytics.js";
import { prisma } from "../src/db.js";
import { clearCanvasPersistenceTimers } from "../src/canvas/persistence.js";
import { configureExportSpecService } from "../src/ai/export-spec-service.js";
import { configureGenerateService } from "../src/ai/generate-service.js";
import {
  createMemoryAiRateLimiter,
  resetAiRateLimiter,
  setAiRateLimiter,
} from "../src/ai/rate-limit.js";
import {
  createMemoryProjectCreateRateLimiter,
  resetProjectCreateRateLimiter,
  setProjectCreateRateLimiter,
} from "../src/projects/create-quota.js";
import { installTestAnalytics } from "./test-analytics.js";

configureGenerateService({
  groqApiKeys: [],
  groqModel: "openai/gpt-oss-20b",
  isTest: true,
});

configureExportSpecService({
  groqApiKeys: [],
  groqModel: "openai/gpt-oss-20b",
  isTest: true,
});

const testAiRateLimiter = createMemoryAiRateLimiter();
const testProjectCreateRateLimiter = createMemoryProjectCreateRateLimiter();

beforeEach(async () => {
  installTestAnalytics();
  testAiRateLimiter.reset();
  setAiRateLimiter(testAiRateLimiter.limiter);
  testProjectCreateRateLimiter.reset();
  setProjectCreateRateLimiter(testProjectCreateRateLimiter.limiter);
  clearCanvasPersistenceTimers();
  await prisma.rating.deleteMany();
  await prisma.aiGeneration.deleteMany();
  await prisma.canvasSnapshot.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  resetAnalytics();
  resetAiRateLimiter();
  resetProjectCreateRateLimiter();
  await prisma.$disconnect();
});
