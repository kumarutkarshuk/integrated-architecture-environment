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

let nextKeyIndex = 0;

export function resetGroqKeyCursor(): void {
  nextKeyIndex = 0;
}

export function takeGroqApiKey(keys: string[]): string {
  if (keys.length === 0) {
    throw new Error("No Groq API key configured");
  }

  const key = keys[nextKeyIndex % keys.length]!;
  nextKeyIndex += 1;
  return key;
}
