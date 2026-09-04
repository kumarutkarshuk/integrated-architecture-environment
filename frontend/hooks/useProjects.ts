"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  fetchProjects,
  type ApiProject,
} from "../lib/api";

export function useProjects(enabled: boolean) {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!enabled) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const projectList = await fetchProjects(token);
      setProjects(projectList);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load projects",
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, getToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const createBlankProject = useCallback(
    async (name: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const project = await createProject(token, { name, mode: "blank" });
      setProjects((current) => [project, ...current]);
      return project;
    },
    [getToken],
  );

  const removeProject = useCallback(
    async (projectId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      await deleteProject(token, projectId);
      setProjects((current) =>
        current.filter((project) => project.id !== projectId),
      );
    },
    [getToken],
  );

  return {
    projects,
    isLoading,
    error,
    createBlankProject,
    removeProject,
  };
}
