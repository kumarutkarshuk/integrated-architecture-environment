"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { RatingValue } from "../lib/api";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface RatingButtonsProps {
  value: RatingValue | null;
  caption?: string;
  disabled?: boolean;
  onRate: (value: RatingValue) => void;
}

export function RatingButtons({
  value,
  caption,
  disabled,
  onRate,
}: RatingButtonsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {caption ? (
        <p className="text-[10px] leading-snug text-muted">{caption}</p>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            value === "up" && "text-accent",
          )}
          disabled={disabled}
          aria-label="Rate up"
          aria-pressed={value === "up"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRate("up");
          }}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0",
            value === "down" && "text-accent",
          )}
          disabled={disabled}
          aria-label="Rate down"
          aria-pressed={value === "down"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRate("down");
          }}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
