const DEFAULT_PATH = "/workspace";

export function toAppRedirectUrl(
  raw: string | null,
  fallbackPath = DEFAULT_PATH,
): string {
  const origin = window.location.origin;
  const fallback = `${origin}${fallbackPath}`;

  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return `${origin}${raw}`;
}
