"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { fetchProjects, type ApiProject } from "../lib/api";

export function useProjects(enabled: boolean) {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProjects([]);
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const projectList = await fetchProjects(token);
        if (!cancelled) {
          setProjects(projectList);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load projects",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [enabled, getToken]);

  return { projects, isLoading, error };
}
