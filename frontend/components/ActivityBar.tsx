"use client";

import { UserButton } from "@clerk/nextjs";
import { Files } from "lucide-react";
import { clerkAppearance } from "../lib/clerkAppearance";
import { ActivityRail, ActivityRailButton } from "./ActivityRail";

interface ActivityBarProps {
  isProjectsOpen: boolean;
  onToggleProjects: () => void;
}

export function ActivityBar({
  isProjectsOpen,
  onToggleProjects,
}: ActivityBarProps) {
  return (
    <ActivityRail
      side="left"
      label="Activity Bar"
      footer={
        <div className="activity-bar-item flex h-10 w-10 items-center justify-center" title="Account">
          <UserButton
            appearance={{
              ...clerkAppearance,
              elements: {
                rootBox: "flex items-center justify-center",
                userButtonBox: "flex items-center justify-center",
                userButtonTrigger: "flex items-center justify-center focus:shadow-none",
                avatarBox: "h-7 w-7 cursor-pointer",
              },
            }}
          />
        </div>
      }
    >
      <ActivityRailButton
        side="left"
        active={isProjectsOpen}
        onClick={onToggleProjects}
        title="Projects"
        aria-label="Explorer View"
      >
        <Files className="h-5 w-5" />
      </ActivityRailButton>
    </ActivityRail>
  );
}
