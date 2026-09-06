import { act, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ExportSpecToolbar } from "./ExportSpecToolbar";

const spec = {
  markdown: "# Todo API\n\nUsers talk to the API Gateway.",
  gaps_summary: "Storage is not shown on the canvas.",
};

function renderToolbar(
  overrides: Partial<ComponentProps<typeof ExportSpecToolbar>> = {},
) {
  const props: ComponentProps<typeof ExportSpecToolbar> = {
    canExport: true,
    isExporting: false,
    spec: null,
    error: null,
    downloadFileName: "todo-api-spec.md",
    onExport: () => undefined,
    onClear: () => undefined,
    onCopy: () => undefined,
    onDownload: () => undefined,
    ...overrides,
  };

  return render(<ExportSpecToolbar {...props} />);
}

function clickButton(name: string | RegExp, container?: HTMLElement) {
  const root = container ? within(container) : screen;
  act(() => {
    root.getByRole("button", { name }).click();
  });
}

describe("ExportSpecToolbar", () => {
  it("shows Export Spec on a ready Project", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("hides Export Spec when the Project is not ready", () => {
    renderToolbar({ canExport: false });
    expect(screen.queryByRole("button", { name: "Export Spec" })).toBeNull();
  });

  it("asks twice before closing the exported Spec", () => {
    const onClear = vi.fn();
    renderToolbar({ spec, onClear });

    clickButton("Close");
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByText("Are you sure?")).toBeTruthy();

    clickButton("Yes, close", screen.getByRole("alertdialog"));
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByText("Have you reviewed the gaps?")).toBeTruthy();

    clickButton(
      "Yes, I reviewed the gaps",
      screen.getByRole("alertdialog"),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("asks if gaps were reviewed before copy and download", () => {
    const onCopy = vi.fn();
    const onDownload = vi.fn();
    renderToolbar({ spec, onCopy, onDownload });

    clickButton("Copy");
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.getByText("Have you reviewed the gaps?")).toBeTruthy();
    clickButton("Copy", screen.getByRole("alertdialog"));
    expect(onCopy).toHaveBeenCalledTimes(1);

    clickButton("Download todo-api-spec.md");
    expect(onDownload).not.toHaveBeenCalled();
    expect(screen.getByText("Have you reviewed the gaps?")).toBeTruthy();
    clickButton("Download", screen.getByRole("alertdialog"));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
