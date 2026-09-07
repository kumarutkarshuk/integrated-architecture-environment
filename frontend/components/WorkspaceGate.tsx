"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { signInPathFor, WORKSPACE_PATH } from "../lib/routes";
import { WorkspaceShell } from "./WorkspaceShell";

function SignedInWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          Loading...
        </div>
      }
    >
      <WorkspaceShell />
    </Suspense>
  );
}

/** Keeps the workspace behind sign-in, and sends deep links back after auth. */
export function WorkspaceGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(signInPathFor(WORKSPACE_PATH));
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <SignedInWorkspace />;
}
