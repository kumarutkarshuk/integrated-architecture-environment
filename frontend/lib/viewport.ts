export const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
export const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

export function isDesktopViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}
