"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

interface CollapsibleSidebarProps {
  title: string;
  side: "left" | "right";
  isOpen: boolean;
  openWidthClass: string;
  onToggleOpen: () => void;
  headerEnd?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSidebar({
  title,
  side,
  isOpen,
  openWidthClass,
  onToggleOpen,
  headerEnd,
  children,
}: CollapsibleSidebarProps) {
  const OpenIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;
  const CloseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const borderClass = side === "left" ? "border-r" : "border-l";

  if (!isOpen) {
    return (
      <aside
        className={`flex h-full w-9 shrink-0 flex-col ${borderClass} border-sidebar-border bg-sidebar`}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="m-1 h-7 w-7 p-0"
          aria-label={`Open ${title}`}
          onClick={onToggleOpen}
        >
          <OpenIcon className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className={`flex h-full ${openWidthClass} shrink-0 flex-col ${borderClass} border-sidebar-border bg-sidebar`}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </span>
        <div className="flex items-center gap-1">
          {headerEnd}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={`Collapse ${title}`}
            onClick={onToggleOpen}
          >
            <CloseIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}
