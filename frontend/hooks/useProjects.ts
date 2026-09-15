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

const PROJECT_LIST_POLL_MS = 2500;

function isProjectNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === "Project not found";
}

export function useProjects(enabled: boolean) {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const projectsRef = useRef<ApiProject[]>([]);
  projectsRef.current = projects;

  const loadProjects = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled) {
      setProjects([]);
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    const knownIds = new Set(projectsRef.current.map((project) => project.id));
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      const projectList = await fetchProjects(token);
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setProjects((current) =>
        mergeServerProjects(projectList, current, knownIds),
      );
    } catch (loadError) {
      if (requestId !== loadRequestIdRef.current || options?.silent) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load projects",
      );
    } finally {
      if (requestId === loadRequestIdRef.current && !options?.silent) {
        setIsLoading(false);
      }
    }
  }, [enabled, getToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadProjects({ silent: true });
    }, PROJECT_LIST_POLL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, loadProjects]);

  const createBlankProject = useCallback(
    async (name: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      loadRequestIdRef.current += 1;
      const project = await createProject(token, { name, mode: "blank" });
      setProjects((current) => upsertProject(current, project));
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
      setProjects((current) => upsertProject(current, project));
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

      try {
        const project = await fetchProject(token, projectId);
        setProjects((current) => upsertProject(current, project));
        return project;
      } catch (error) {
        if (isProjectNotFoundError(error)) {
          setProjects((current) =>
            current.filter((project) => project.id !== projectId),
          );
        }
        throw error;
      }
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

function upsertProject(
  current: ApiProject[],
  project: ApiProject,
): ApiProject[] {
  return sortProjects([
    project,
    ...current.filter((entry) => entry.id !== project.id),
  ]);
}

function mergeServerProjects(
  serverList: ApiProject[],
  current: ApiProject[],
  knownIds: Set<string>,
): ApiProject[] {
  const serverIds = new Set(serverList.map((project) => project.id));
  const currentIds = new Set(current.map((project) => project.id));
  const kept = current.filter(
    (project) =>
      serverIds.has(project.id) ||
      (!knownIds.has(project.id) && !serverIds.has(project.id)),
  );
  const added = serverList.filter((project) => !currentIds.has(project.id));
  return sortProjects([...kept, ...added]);
}

function sortProjects(projects: ApiProject[]): ApiProject[] {
  return [...projects].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
