"use client";

import { LandingArchitecture } from "./landing/LandingArchitecture";
import { LandingFeatures } from "./landing/LandingFeatures";
import { LandingFooter } from "./landing/LandingFooter";
import { LandingHero } from "./landing/LandingHero";
import { LandingNavbar } from "./landing/LandingNavbar";
import { LandingWorkflow } from "./landing/LandingWorkflow";

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingArchitecture />
        <LandingWorkflow />
      </main>
      <LandingFooter />
    </div>
  );
}
