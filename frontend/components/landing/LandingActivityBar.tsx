"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { Files, User } from "lucide-react";
import Link from "next/link";
import { clerkAppearance } from "../../lib/clerkAppearance";
import { ActivityRail } from "../ActivityRail";

export function LandingActivityBar() {
  const { isSignedIn } = useAuth();

  return (
    <ActivityRail
      side="left"
      label="Activity Bar"
      footer={
        isSignedIn ? (
          <div
            className="activity-bar-item flex h-10 w-10 items-center justify-center"
            title="Account"
          >
            <UserButton
              appearance={{
                ...clerkAppearance,
                elements: {
                  rootBox: "flex items-center justify-center",
                  userButtonBox: "flex items-center justify-center",
                  userButtonTrigger:
                    "flex items-center justify-center focus:shadow-none",
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
        )
      }
    >
      <span
        title="Overview"
        aria-label="Overview"
        className="activity-bar-item group relative flex h-10 w-10 items-center justify-center rounded bg-hover/40 text-foreground"
      >
        <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-r bg-accent" />
        <Files className="h-5 w-5" />
      </span>
    </ActivityRail>
  );
}
