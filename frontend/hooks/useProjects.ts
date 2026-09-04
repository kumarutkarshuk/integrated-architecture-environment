"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
  type ApiProject,
} from "../lib/api";

export function useProjects(enabled: boolean) {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  const loadProjects = useCallback(async () => {
    if (!enabled) {
      setProjects([]);
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const projectList = await fetchProjects(token);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setProjects((current) => mergeProjectLists(projectList, current));
    } catch (loadError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load projects",
      );
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
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

      loadRequestIdRef.current += 1;
      const project = await createProject(token, { name, mode: "blank" });
      setProjects((current) => mergeProjectLists([project], current));
      return project;
    },
    [getToken],
  );

  const createPromptProject = useCallback(
    async (name: string, prompt: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      loadRequestIdRef.current += 1;
      const project = await createProject(token, {
        name,
        mode: "prompt",
        prompt,
      });
      setProjects((current) => mergeProjectLists([project], current));
      return project;
    },
    [getToken],
  );

  const refreshProject = useCallback(
    async (projectId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const project = await fetchProject(token, projectId);
      setProjects((current) =>
        current.map((entry) => (entry.id === projectId ? project : entry)),
      );
      return project;
    },
    [getToken],
  );

  const updateProjectInList = useCallback((project: ApiProject) => {
    setProjects((current) =>
      current.map((entry) => (entry.id === project.id ? project : entry)),
    );
  }, []);

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
    createPromptProject,
    refreshProject,
    updateProjectInList,
    removeProject,
  };
}

function mergeProjectLists(
  primary: ApiProject[],
  secondary: ApiProject[],
): ApiProject[] {
  const merged = new Map<string, ApiProject>();

  for (const project of secondary) {
    merged.set(project.id, project);
  }

  for (const project of primary) {
    merged.set(project.id, project);
  }

  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
