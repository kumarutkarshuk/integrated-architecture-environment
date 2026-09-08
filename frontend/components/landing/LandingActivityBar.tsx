"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { Files, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { clerkAppearance } from "../../lib/clerkAppearance";

interface LandingActivityBarProps {
  activeSection: "overview" | "workflow";
  onNavigate: (section: "overview" | "workflow") => void;
}

export function LandingActivityBar({
  activeSection,
  onNavigate,
}: LandingActivityBarProps) {
  const { isSignedIn } = useAuth();

  return (
    <aside
      className="activity-bar z-10 flex h-full w-12 shrink-0 flex-col justify-between border-r border-sidebar-border bg-[#181818] py-2 select-none"
      aria-label="Activity Bar"
    >
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigate("overview")}
          title="Overview"
          aria-label="Overview"
          className={`activity-bar-item group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded transition-transform duration-100 active:scale-[0.97] ${
            activeSection === "overview"
              ? "bg-hover/40 text-foreground"
              : "text-muted hover:bg-hover/50 hover:text-foreground"
          }`}
        >
          {activeSection === "overview" && (
            <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-r bg-accent" />
          )}
          <Files className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("workflow")}
          title="Workflow"
          aria-label="Workflow"
          className={`activity-bar-item group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded transition-transform duration-100 active:scale-[0.97] ${
            activeSection === "workflow"
              ? "bg-hover/40 text-foreground"
              : "text-muted hover:bg-hover/50 hover:text-foreground"
          }`}
        >
          {activeSection === "workflow" && (
            <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-r bg-accent" />
          )}
          <Sparkles className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col items-center">
        {isSignedIn ? (
          <div
            className="activity-bar-item flex h-10 w-10 items-center justify-center"
            title="Account"
          >
            <UserButton
              appearance={{
                ...clerkAppearance,
                elements: {
                  avatarBox: "h-7 w-7 cursor-pointer",
                },
              }}
              afterSignOutUrl="/"
            />
          </div>
        ) : (
          <Link
            href="/sign-in"
            title="Sign in"
            aria-label="Sign in"
            className="activity-bar-item flex h-10 w-10 cursor-pointer items-center justify-center rounded text-muted transition-transform duration-100 hover:bg-hover/50 hover:text-foreground active:scale-[0.97]"
          >
            <User className="h-5 w-5" />
          </Link>
        )}
      </div>
    </aside>
  );
}
