"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

interface ActivityRailProps {
  side: "left" | "right";
  label: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function ActivityRail({
  side,
  label,
  children,
  footer,
}: ActivityRailProps) {
  return (
    <aside
      className={cn(
        "activity-bar z-10 flex h-full w-12 shrink-0 flex-col items-center justify-between bg-[#181818] py-2 select-none",
        side === "left" ? "border-r" : "border-l",
        "border-sidebar-border",
      )}
      aria-label={label}
    >
      <div className="flex w-full flex-col items-center gap-1.5">{children}</div>
      {footer ? (
        <div className="flex w-full items-center justify-center">{footer}</div>
      ) : null}
    </aside>
  );
}

interface ActivityRailButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  side: "left" | "right";
  active?: boolean;
}

export function ActivityRailButton({
  side,
  active = false,
  className,
  children,
  ...props
}: ActivityRailButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "activity-bar-item group relative flex h-10 w-10 items-center justify-center rounded transition-transform duration-100",
        props.disabled
          ? "cursor-default"
          : "cursor-pointer active:scale-[0.97]",
        active
          ? "bg-hover/40 text-foreground"
          : "text-muted hover:bg-hover/50 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {active && (
        <span
          className={cn(
            "absolute top-2 bottom-2 w-0.5 bg-accent",
            side === "left" ? "left-0 rounded-r" : "right-0 rounded-l",
          )}
        />
      )}
      {children}
    </button>
  );
}
