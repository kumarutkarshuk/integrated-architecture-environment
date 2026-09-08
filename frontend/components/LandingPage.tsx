"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LandingHeroDiagram } from "./LandingHeroDiagram";

function LandingPageContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    const project = searchParams.get("project");
    const target = project
      ? `/workspace?project=${encodeURIComponent(project)}`
      : "/workspace";

    router.replace(target);
  }, [isLoaded, isSignedIn, router, searchParams]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Opening workspace...
      </div>
    );
  }

  const signInUrl = `/sign-in?redirect_url=${encodeURIComponent("/workspace")}`;
  const signUpUrl = `/sign-up?redirect_url=${encodeURIComponent("/workspace")}`;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-selection">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-titlebar/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-accent font-mono text-sm font-bold text-white shadow-sm">
              IAE
            </span>
            <span className="font-semibold tracking-tight text-foreground">
              Integrated Architecture Environment
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a
              href="#architecture"
              className="hover:text-foreground transition-colors"
            >
              Architecture
            </a>
            <a href="#specs" className="hover:text-foreground transition-colors">
              Spec Export
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={signInUrl}
              className="rounded px-3 py-1.5 text-xs font-medium text-foreground hover:bg-hover transition-colors"
            >
              Sign In
            </Link>
            <Link
              href={signUpUrl}
              className="hidden rounded border border-sidebar-border bg-panel px-3 py-1.5 text-xs font-medium text-foreground hover:bg-hover transition-colors sm:inline-block"
            >
              Get Started
            </Link>
            <Link
              href="/workspace"
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-panel px-3 py-1 text-xs text-muted mb-6">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span>Next-Gen Collaborative Canvas for Engineering Teams</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Design, iterate, and export system architecture at the speed of thought.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted sm:text-lg">
            The collaborative visual workspace where engineering teams map
            systems, prompt AI to propose architectures, co-edit with live cursors,
            and export clean markdown specifications with gap analysis.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/workspace"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              Open Workspace →
            </Link>
            <Link
              href={signInUrl}
              className="rounded-lg border border-sidebar-border bg-panel px-6 py-3 text-sm font-semibold text-foreground hover:bg-hover transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="text-accent font-bold">✓</span> Real-Time CRDT Sync
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-accent font-bold">✓</span> AI Architecture Previews
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-accent font-bold">✓</span> Automated Spec Export
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-accent font-bold">✓</span> Email-Bound Team Invites
            </span>
          </div>
        </div>

        {/* Live Architecture Visual */}
        <section id="architecture" className="mt-14 scroll-mt-20">
          <div className="mb-4 text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Interactive System Canvas
            </span>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              Live Architecture & Data Flow
            </h2>
          </div>
          <LandingHeroDiagram />
        </section>

        {/* Features Grid */}
        <section id="features" className="mt-24 scroll-mt-20">
          <div className="mb-10 text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-accent">
              Core Capabilities
            </span>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              Built for speed, clarity, and team alignment
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-sidebar-border bg-panel p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-base font-bold">
                01
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Real-Time Multi-User Canvas
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Draw system components, flows, and boundaries without friction.
                Powered by Yjs CRDTs over WebSocket for instant, conflict-free
                syncing with visible multi-user presence.
              </p>
            </div>

            <div className="rounded-xl border border-sidebar-border bg-panel p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-base font-bold">
                02
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                AI Architecture Previews
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Describe your system requirements in plain language. Generate,
                inspect, and compare AI proposals side-by-side, then apply the
                chosen preview directly to the live canvas.
              </p>
            </div>

            <div id="specs" className="rounded-xl border border-sidebar-border bg-panel p-6 shadow-sm scroll-mt-20">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-base font-bold">
                03
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Instant Spec & Gap Analysis
              </h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Export comprehensive markdown specifications directly from your
                visual canvas with one click. Automatically highlights inferred
                technologies and missing architecture gaps.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="mt-24 rounded-2xl border border-sidebar-border bg-sidebar/90 p-8 text-center shadow-xl sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to design your next system architecture?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
            Start collaborating with your team in seconds. Create blank canvases or
            prompt AI to generate full architectural layouts.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/workspace"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              Open Workspace
            </Link>
            <Link
              href={signUpUrl}
              className="rounded-lg border border-sidebar-border bg-panel px-6 py-3 text-sm font-semibold text-foreground hover:bg-hover transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-sidebar-border bg-titlebar/50 px-4 py-8 text-xs text-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Integrated Architecture Environment
            </span>
            <span>• Real-time AI-assisted system design</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/workspace" className="hover:text-foreground transition-colors">
              Workspace
            </Link>
            <Link href={signInUrl} className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href={signUpUrl} className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          Loading...
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  );
}
