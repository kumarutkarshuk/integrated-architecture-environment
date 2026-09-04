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

export interface GenerateResult {
  records: Record<string, unknown>;
}
