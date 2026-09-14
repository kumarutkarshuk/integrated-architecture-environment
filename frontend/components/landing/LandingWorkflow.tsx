"use client";

import { WebMcpLinkGraphic } from "../WebMcpLinkGraphic";

export function LandingWorkflow() {
  return (
    <div
      role="region"
      aria-label="WebMCP local agent preview"
      className="pointer-events-none flex min-h-0 flex-1 flex-col font-mono text-xs"
    >
      <WebMcpLinkGraphic />
    </div>
  );
}
