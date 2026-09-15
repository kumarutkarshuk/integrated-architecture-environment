export class InappropriatePromptError extends Error {
  readonly status = 400;

  constructor() {
    super("This prompt is not allowed");
    this.name = "InappropriatePromptError";
  }
}

const HARD_BLOCK = [
  /\b(child|children|kid|kids|minor|minors|toddler|infant|underage|preteen)\b[\s\S]{0,48}\b(sex|sexual|porn|porno|xxx|nude|naked|erotic|nsfw)\b/i,
  /\b(sex|sexual|porn|porno|xxx|nude|naked|erotic|nsfw)\b[\s\S]{0,48}\b(child|children|kid|kids|minor|minors|toddler|infant|underage|preteen)\b/i,
  /\b(csam|child.?porn|child.?sexual)\b/i,
  /\b(porn|porno|pornography|hentai|onlyfans|xxx)\b/i,
  /\b(erotic|nsfw|nude|naked)\b/i,
  /\b(kill\s+myself|suicid(e|al)|how\s+to\s+die)\b/i,
  /\bhow\s+to\s+(kill|murder|rape)\b/i,
  /\b(make|build|assemble|create|craft|construct|design|draw|generate)\s+(me\s+)?(a\s+|an\s+)?(bomb|pipe\s*bomb|explosive|weapon|gun|firearm|rifle|pistol|missile|nuke)s?\b(?!\s+(detection|detector|inventory|tracking|moderation|filter|keyword|screening|classifier))/i,
  /\b(cook\s+meth|synthesize\s+(meth|fentanyl))\b/i,
  /\b(ignore|bypass|override)\s+(all\s+)?(previous|prior|the)?\s*(instructions?|rules?|guardrails?|filters?|safety|policy)\b/i,
  /\b(you\s+are\s+(now\s+)?(dan|jailbroken)|do\s+anything\s+now|jailbreak)\b/i,
];

export type PromptSafetyClassifier = (prompt: string) => Promise<boolean>;

export function isInappropriatePrompt(prompt: string): boolean {
  const text = prompt.trim();
  if (!text) {
    return false;
  }

  return HARD_BLOCK.some((pattern) => pattern.test(text));
}

export function assertPromptBlockedByCode(prompt: string): void {
  if (isInappropriatePrompt(prompt)) {
    throw new InappropriatePromptError();
  }
}

export async function assertPromptAllowed(prompt: string): Promise<void> {
  assertPromptBlockedByCode(prompt);
}
