-- AlterTable
ALTER TABLE "ai_generation" ADD COLUMN "plan" JSONB,
ADD COLUMN "prompt_version" TEXT,
ADD COLUMN "provider" TEXT;
