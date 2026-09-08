"use client";

import { useState } from "react";

const WORKFLOW_STEPS = [
  {
    id: "prompt",
    title: "Prompt",
    detail:
      "Describe the system. IAE draws nodes and message paths on the canvas.",
  },
  {
    id: "draw",
    title: "Draw",
    detail:
      "Edit the live canvas with teammates. Specs stay in sync with the graph.",
  },
  {
    id: "export",
    title: "Export",
    detail: "Download a markdown spec ready for review and pull requests.",
  },
] as const;

export function LandingWorkflow() {
  const [activeId, setActiveId] = useState<
    (typeof WORKFLOW_STEPS)[number]["id"]
  >("prompt");

  const activeStep =
    WORKFLOW_STEPS.find((step) => step.id === activeId) ?? WORKFLOW_STEPS[0];

  return (
    <section className="flex h-full min-h-0 flex-col md:flex-row" aria-label="Workflow">
      <div className="flex w-full shrink-0 flex-row overflow-x-auto border-b border-sidebar-border bg-sidebar md:w-56 md:flex-col md:border-r md:border-b-0">
        <div className="hidden border-b border-sidebar-border px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-muted uppercase md:block">
          Moves
        </div>
        <div className="flex flex-row p-1 md:flex-col">
          {WORKFLOW_STEPS.map((step) => {
            const isActive = step.id === activeId;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveId(step.id)}
                title={step.title}
                className={`cursor-pointer rounded-md px-2.5 py-2 text-left transition-transform duration-100 active:scale-[0.99] ${
                  isActive
                    ? "bg-hover text-foreground"
                    : "text-muted hover:bg-hover/60 hover:text-foreground"
                }`}
              >
                <span className="block truncate font-mono text-xs font-medium">
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center p-6 md:p-10">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {activeStep.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">
            {activeStep.detail}
          </p>
        </div>
      </div>
    </section>
  );
}
