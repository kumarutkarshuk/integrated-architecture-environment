"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { WorkspaceShell } from "../components/WorkspaceShell";

export function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
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

  return <WorkspaceShell />;
}
