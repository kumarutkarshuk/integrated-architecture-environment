"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--sidebar)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--sidebar-border)",
          "--error-bg": "var(--destructive)",
          "--error-text": "var(--destructive-foreground)",
          "--error-border": "var(--destructive-foreground)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
