import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExportSpecToolbar } from "./ExportSpecToolbar";

describe("ExportSpecToolbar", () => {
  it("shows Export Spec on a ready Project", () => {
    render(
      <ExportSpecToolbar
        canExport
        isExporting={false}
        spec={null}
        error={null}
        downloadFileName="todo-api-spec.md"
        onExport={() => undefined}
        onClear={() => undefined}
        onDownload={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("hides Export Spec when the Project is not ready", () => {
    render(
      <ExportSpecToolbar
        canExport={false}
        isExporting={false}
        spec={null}
        error={null}
        downloadFileName="todo-api-spec.md"
        onExport={() => undefined}
        onClear={() => undefined}
        onDownload={() => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: "Export Spec" })).toBeNull();
  });

  it("lets the user view and download the exported Spec", () => {
    const onDownload = vi.fn();

    render(
      <ExportSpecToolbar
        canExport
        isExporting={false}
        spec={{
          markdown: "# Todo API\n\nUsers talk to the API Gateway.",
          gaps_summary: "Storage is not shown on the canvas.",
        }}
        error={null}
        downloadFileName="todo-api-spec.md"
        onExport={() => undefined}
        onClear={() => undefined}
        onDownload={onDownload}
      />,
    );

    expect(screen.getByText(/Users talk to the API Gateway/)).toBeTruthy();
    expect(
      screen.getByText("Storage is not shown on the canvas."),
    ).toBeTruthy();

    screen.getByRole("button", { name: "Download todo-api-spec.md" }).click();
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
