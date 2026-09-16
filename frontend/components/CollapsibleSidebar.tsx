"use client";

import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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

const DESKTOP_MOTION =
  "md:motion-safe:transition-[width,border-color] md:motion-safe:duration-300 md:motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]";

function desktopOpenWidth(openWidthClass: string): string {
  return openWidthClass.includes("w-64") ? "md:w-64" : "md:w-72";
}

function mobileClosedX(side: "left" | "right"): string {
  return side === "left" ? "calc(-100% - 3rem)" : "calc(100% + 3rem)";
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
          "iae-sidebar-scrim absolute inset-y-0 left-12 right-12 z-[15] bg-black/50 md:hidden",
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
        style={
          {
            "--iae-sidebar-x": isMobileShown ? "0px" : mobileClosedX(side),
          } as CSSProperties
        }
        className={cn(
          "iae-sidebar-panel flex h-full min-w-0 flex-col overflow-hidden bg-sidebar",
          DESKTOP_MOTION,
          "absolute inset-y-0 z-20 w-[min(18rem,calc(100%-6rem))]",
          side === "left" ? "left-12" : "right-12",
          "md:static md:left-auto md:right-auto md:z-auto",
          isOpen
            ? cn(
                "md:shrink-0",
                borderClass,
                "border-sidebar-border",
                desktopOpenWidth(openWidthClass),
              )
            : "md:w-0 md:border-transparent",
          isOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
          <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted">
            {title}
          </span>
          <div className="flex shrink-0 items-center gap-1">
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
          {children}
        </div>
      </aside>
    </>
  );
}
