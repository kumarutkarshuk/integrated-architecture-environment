"use client";

import { useCallback, useEffect, useState } from "react";

export const PROJECTS_SIDEBAR_STORAGE_KEY = "iae.sidebar.projects.open";
export const AI_SIDEBAR_STORAGE_KEY = "iae.sidebar.ai.open";

function readStoredOpen(storageKey: string): boolean {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "false") {
    return false;
  }

  return true;
}

export function useSidebarOpen(storageKey: string) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setIsOpen(readStoredOpen(storageKey));
  }, [storageKey]);

  const setOpen = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      window.localStorage.setItem(storageKey, next ? "true" : "false");
    },
    [storageKey],
  );

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      const next = !current;
      window.localStorage.setItem(storageKey, next ? "true" : "false");
      return next;
    });
  }, [storageKey]);

  return { isOpen, toggle, setOpen };
}
