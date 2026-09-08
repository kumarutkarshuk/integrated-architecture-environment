"use client";

import { useCallback, useEffect, useState } from "react";

export const PROJECTS_SIDEBAR_WIDTH_STORAGE_KEY =
  "iae.sidebar.projects.width";
export const AI_SIDEBAR_WIDTH_STORAGE_KEY = "iae.sidebar.ai.width";

export const DEFAULT_PROJECTS_SIDEBAR_WIDTH = 260;
export const DEFAULT_AI_SIDEBAR_WIDTH = 300;

function readStoredWidth(
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
): number {
  if (typeof window === "undefined") {
    return defaultWidth;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return defaultWidth;
  }

  const parsed = Number.parseInt(stored, 10);
  if (Number.isNaN(parsed) || parsed < minWidth || parsed > maxWidth) {
    return defaultWidth;
  }

  return parsed;
}

interface UseSidebarWidthOptions {
  storageKey: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useSidebarWidth({
  storageKey,
  defaultWidth,
  minWidth = 180,
  maxWidth = 600,
}: UseSidebarWidthOptions) {
  const [width, setWidth] = useState<number>(() =>
    readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth),
  );
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setWidth(readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth));
  }, [storageKey, defaultWidth, minWidth, maxWidth]);

  const updateWidth = useCallback(
    (newWidth: number) => {
      const clamped = Math.max(minWidth, Math.min(maxWidth, Math.round(newWidth)));
      setWidth(clamped);
      try {
        window.localStorage.setItem(storageKey, String(clamped));
      } catch {
        // Ignore storage write issues (e.g. private mode quota).
      }
    },
    [storageKey, minWidth, maxWidth],
  );

  const resetWidth = useCallback(() => {
    updateWidth(defaultWidth);
  }, [updateWidth, defaultWidth]);

  const startResizing = useCallback(
    (side: "left" | "right", startX: number) => {
      const initialWidth = width;
      setIsResizing(true);

      function onMouseMove(event: MouseEvent) {
        event.preventDefault();
        const delta = event.clientX - startX;
        const nextWidth =
          side === "left" ? initialWidth + delta : initialWidth - delta;
        updateWidth(nextWidth);
      }

      function onMouseUp() {
        setIsResizing(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [width, updateWidth],
  );

  return {
    width,
    setWidth: updateWidth,
    resetWidth,
    isResizing,
    startResizing,
  };
}
