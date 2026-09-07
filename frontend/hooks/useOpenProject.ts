"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { workspacePathForProject, WORKSPACE_PATH } from "../lib/routes";

interface OpenProjectLoad {
  isLoading: boolean;
  error: string | null;
}

export function useOpenProject(
  projects: Array<{ id: string }>,
  projectsLoad: OpenProjectLoad,
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("project");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const hasStartedLoadingRef = useRef(false);
  const appliedUrlProject = useRef<string | null>(null);

  if (projectsLoad.isLoading) {
    hasStartedLoadingRef.current = true;
  }

  const hasLoadedProjects =
    hasStartedLoadingRef.current &&
    !projectsLoad.isLoading &&
    !projectsLoad.error;

  useEffect(() => {
    if (!hasLoadedProjects || !projectFromUrl) {
      return;
    }

    if (projects.some((project) => project.id === projectFromUrl)) {
      if (appliedUrlProject.current !== projectFromUrl) {
        setSelectedProjectId(projectFromUrl);
        appliedUrlProject.current = projectFromUrl;
      }
      return;
    }

    if (
      selectedProjectId &&
      projects.some((project) => project.id === selectedProjectId)
    ) {
      return;
    }

    appliedUrlProject.current = null;
    setSelectedProjectId(null);
    router.replace(WORKSPACE_PATH);
  }, [
    hasLoadedProjects,
    projectFromUrl,
    projects,
    router,
    selectedProjectId,
  ]);

  const selectProject = useCallback(
    (projectId: string) => {
      setSelectedProjectId(projectId);
      router.replace(workspacePathForProject(projectId));
    },
    [router],
  );

  const clearOpenProject = useCallback(() => {
    setSelectedProjectId(null);
    router.replace(WORKSPACE_PATH);
  }, [router]);

  return {
    selectedProjectId,
    selectProject,
    clearOpenProject,
  };
}
