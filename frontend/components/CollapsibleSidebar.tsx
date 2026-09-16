"use client";

import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../lib/utils";
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

const SIDEBAR_MOTION =
  "motion-safe:transition-[width,transform,border-color,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]";

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
  const [allowMobileOpen, setAllowMobileOpen] = useState(false);

  useEffect(() => {
    setAllowMobileOpen(true);
  }, []);

  const isMobileShown = isOpen && allowMobileOpen;

  return (
    <>
      <button
        type="button"
        className={cn(
          "absolute inset-y-0 left-12 right-12 z-[15] bg-black/50 md:hidden",
          SIDEBAR_MOTION,
          isMobileShown ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label={`Dismiss ${title}`}
        aria-hidden={!isMobileShown}
        tabIndex={isMobileShown && !lockOpen ? 0 : -1}
        disabled={lockOpen || !isMobileShown}
        onClick={() => {
          if (lockOpen || !isMobileShown) {
            return;
          }
          onToggleOpen();
        }}
      />
      <aside
        aria-label={title}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden bg-sidebar",
          SIDEBAR_MOTION,
          isOpen
            ? cn(borderClass, "border-sidebar-border", openWidthClass)
            : "w-0 border-transparent",
          "max-md:absolute max-md:inset-y-0 max-md:z-20 max-md:w-72 max-md:max-w-[calc(100%-3rem)]",
          side === "left" ? "max-md:left-12" : "max-md:right-12",
          isMobileShown
            ? "max-md:translate-x-0"
            : side === "left"
              ? "max-md:-translate-x-[calc(100%+0.75rem)]"
              : "max-md:translate-x-[calc(100%+0.75rem)]",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
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
    </>
  );
}
