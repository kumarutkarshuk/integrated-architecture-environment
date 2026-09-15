"use client";

import { LoaderCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import type { RatingValue } from "../lib/api";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface RatingButtonsProps {
  value: RatingValue | null;
  caption?: string;
  disabled?: boolean;
  onRate: (value: RatingValue) => void | Promise<void>;
}

export function RatingButtons({
  value,
  caption,
  disabled,
  onRate,
}: RatingButtonsProps) {
  const [pendingValue, setPendingValue] = useState<RatingValue | null>(null);
  const shown = pendingValue ?? value;
  const pending = pendingValue !== null;

  async function handleRate(next: RatingValue) {
    if (disabled || pending) {
      return;
    }

    setPendingValue(next);
    try {
      await onRate(next);
    } finally {
      setPendingValue(null);
    }
  }

  return (
    <div
      className="flex flex-col gap-1.5"
      role="group"
      aria-label="Rating"
      aria-busy={pending}
    >
      {caption ? (
        <p className="text-[10px] leading-snug text-muted">
          {pending ? "Saving..." : caption}
        </p>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0", shown === "up" && "text-accent")}
          disabled={disabled || pending}
          aria-label="Rate up"
          aria-pressed={shown === "up"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleRate("up");
          }}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0", shown === "down" && "text-accent")}
          disabled={disabled || pending}
          aria-label="Rate down"
          aria-pressed={shown === "down"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleRate("down");
          }}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
        {pending ? (
          <>
            <LoaderCircle
              className="h-3.5 w-3.5 animate-spin text-muted"
              aria-hidden
            />
            {caption ? null : (
              <span className="text-[10px] leading-snug text-muted">
                Saving...
              </span>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
