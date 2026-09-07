"use client";

import { useAuth } from "@clerk/nextjs";
import { CollaborationShowcase } from "./CollaborationShowcase";
import { FeatureGrid } from "./FeatureGrid";
import { LandingFooter } from "./LandingFooter";
import { LandingHero } from "./LandingHero";
import { LandingNav } from "./LandingNav";
import { PromptProjectShowcase } from "./PromptProjectShowcase";
import { SpecExportShowcase } from "./SpecExportShowcase";

/**
 * The public front door. Signed-in Users are shown the way to the workspace
 * rather than pushed into it, so the page can still be shown to someone else.
 */
export function LandingPage() {
  const { isSignedIn } = useAuth();
  const hasSession = Boolean(isSignedIn);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <LandingNav isSignedIn={hasSession} />

      <main>
        <LandingHero isSignedIn={hasSession} />
        <PromptProjectShowcase />
        <SpecExportShowcase />
        <CollaborationShowcase />
        <FeatureGrid />
      </main>

      <LandingFooter />
    </div>
  );
}
