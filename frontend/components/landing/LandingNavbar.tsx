"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "../ui/button";

export function LandingNavbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-sidebar-border bg-sidebar/90 px-4 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent text-xs font-bold text-white shadow-sm">
            IAE
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Integrated Architecture Environment
          </span>
        </Link>
        <span className="hidden rounded bg-hover px-2 py-0.5 font-mono text-[11px] text-muted md:inline-block">
          v1.0
        </span>
      </div>

      <nav className="flex items-center gap-3">
        <a
          href="#features"
          className="hidden text-xs text-muted transition-colors hover:text-foreground md:inline-block"
        >
          Capabilities
        </a>
        <a
          href="#architecture"
          className="hidden text-xs text-muted transition-colors hover:text-foreground md:inline-block"
        >
          Architecture
        </a>
        <a
          href="#workflow"
          className="hidden text-xs text-muted transition-colors hover:text-foreground md:inline-block"
        >
          Workflow
        </a>
        {isSignedIn ? (
          <Button asChild size="sm">
            <Link href="/workspace">Open Workspace</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/workspace">Launch Studio</Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}
