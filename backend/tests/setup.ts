import { prisma } from "../src/db.js";
import { clearCanvasPersistenceTimers } from "../src/canvas/persistence.js";
import { configureGenerateService } from "../src/ai/generate-service.js";

configureGenerateService({
  groqModel: "openai/gpt-oss-20b",
  isTest: true,
});

beforeEach(async () => {
  clearCanvasPersistenceTimers();
  await prisma.aiGeneration.deleteMany();
  await prisma.canvasSnapshot.deleteMany();
  await prisma.projectInvite.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
