"use client";

import { PanelLeftClose, PanelRightClose } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

interface CollapsibleSidebarProps {
  title: string;
  side: "left" | "right";
  isOpen: boolean;
  openWidthClass: string;
  onToggleOpen: () => void;
  lockOpen?: boolean;
  headerEnd?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSidebar({
  title,
  side,
  isOpen,
  openWidthClass,
  onToggleOpen,
  lockOpen = false,
  headerEnd,
  children,
}: CollapsibleSidebarProps) {
  const CloseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const borderClass = side === "left" ? "border-r" : "border-l";

  if (!isOpen) {
    return null;
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
            title={
              lockOpen ? `${title} stays open in preview` : `Collapse ${title}`
            }
            disabled={lockOpen}
            onClick={() => {
              if (lockOpen) {
                return;
              }
              onToggleOpen();
            }}
          >
            <CloseIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}
