"use client";

import { Sparkles } from "lucide-react";
import { ActivityRail, ActivityRailButton } from "./ActivityRail";

interface RightActivityBarProps {
  isAiOpen: boolean;
  onToggleAi: () => void;
  lockOpen?: boolean;
}

export function RightActivityBar({
  isAiOpen,
  onToggleAi,
  lockOpen = false,
}: RightActivityBarProps) {
  const canToggle = !lockOpen || !isAiOpen;

  return (
    <ActivityRail side="right" label="Secondary Activity Bar">
      <ActivityRailButton
        side="right"
        active={isAiOpen}
        disabled={!canToggle}
        title={lockOpen ? "AI panel stays open in preview" : "AI panel"}
        aria-label="AI panel View"
        onClick={() => {
          if (!canToggle) {
            return;
          }
          onToggleAi();
        }}
      >
        <Sparkles className="h-5 w-5 text-sky-400 animate-ai-sparkle" />
      </ActivityRailButton>
    </ActivityRail>
  );
}
