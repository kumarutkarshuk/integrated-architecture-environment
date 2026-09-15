import { AsyncLocalStorage } from "node:async_hooks";

const groqKeySlot = new AsyncLocalStorage<number>();

export function parseGroqApiKeys(
  env: NodeJS.Dict<string> = process.env,
): string[] {
  const numbered = [env.GROQ_API_KEY, env.GROQ_API_KEY_2, env.GROQ_API_KEY_3]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const listed = (env.GROQ_API_KEYS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const keys: string[] = [];
  for (const key of [...numbered, ...listed]) {
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  return keys;
}

let nextKeyIndex =
  process.env.NODE_ENV === "test" ? 0 : Math.floor(Math.random() * 1_000_000);

export function resetGroqKeyCursor(index = 0): void {
  nextKeyIndex = index;
}

export function takeGroqApiKeyIndex(keys: string[]): number {
  if (keys.length === 0) {
    throw new Error("No Groq API key configured");
  }

  const index = nextKeyIndex % keys.length;
  nextKeyIndex += 1;
  return index;
}

export function takeGroqApiKey(keys: string[]): string {
  return keys[takeGroqApiKeyIndex(keys)]!;
}

export function startGroqKeyIndex(keys: string[]): number {
  if (keys.length === 0) {
    throw new Error("No Groq API key configured");
  }

  const slot = groqKeySlot.getStore();
  if (slot !== undefined) {
    return slot % keys.length;
  }

  return takeGroqApiKeyIndex(keys);
}

export async function runWithGroqKeySlot<T>(
  keys: string[],
  fn: () => Promise<T>,
): Promise<T> {
  const index = takeGroqApiKeyIndex(keys);
  return groqKeySlot.run(index, fn);
}

export function groqKeyForAttempt(
  keys: string[],
  startIndex: number,
  attempt: number,
): string {
  if (keys.length === 0) {
    throw new Error("No Groq API key configured");
  }

  return keys[(startIndex + attempt) % keys.length]!;
}
