import type { DiagramPlan } from "./diagram-plan.js";

export const GENERATE_TASK_ID = "generate";
export const EXPORT_SPEC_TASK_ID = "export-spec";

export type AiGenerationType = "generate" | "export_spec";

export type AiGenerationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface GenerateJobPayload {
  aiGenerationId: string;
  projectId: string;
  prompt: string;
}

export interface ExportSpecJobPayload {
  aiGenerationId: string;
  projectId: string;
}

export interface GenerateResult {
  records: Record<string, unknown>;
  plan?: DiagramPlan;
  tokensUsed?: number;
  model?: string;
}

export interface ExportSpecResult {
  markdown: string;
  gaps_summary: string;
  tokensUsed?: number;
  model?: string;
}
