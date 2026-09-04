"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { WorkspaceShell } from "../components/WorkspaceShell";

export function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <SignIn routing="hash" />
      </div>
    );
  }

  return <WorkspaceShell />;
}
