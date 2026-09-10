"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { WorkspaceShell } from "./WorkspaceShell";

function SignedInWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          Loading workspace...
        </div>
      }
    >
      <WorkspaceShell />
    </Suspense>
  );
}

export function WorkspacePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in?redirect_url=/workspace");
    }
  }, [isLoaded, isSignedIn, router]);

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

  return <SignedInWorkspace />;
}
