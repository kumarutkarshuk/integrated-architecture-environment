"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { WorkspaceShell } from "./WorkspaceShell";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || isSignedIn) {
      return;
    }

    const project = searchParams.get("project");
    const redirectTarget = project
      ? `/workspace?project=${encodeURIComponent(project)}`
      : "/workspace";

    router.replace(
      `/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}`,
    );
  }, [isLoaded, isSignedIn, router, searchParams]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Loading workspace...
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <WorkspaceShell />;
}

export function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          Loading workspace...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
