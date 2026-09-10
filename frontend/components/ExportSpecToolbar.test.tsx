import { act, render, screen, within } from "@testing-library/react";
import type { ComponentProps, MutableRefObject } from "react";
import { describe, expect, it, vi } from "vitest";
import { ExportSpecPanel, ExportSpecToolbar } from "./ExportSpecToolbar";

const spec = {
  markdown: "# Todo API\n\nUsers talk to the API Gateway.",
  gaps_summary: "Storage is not shown on the canvas.",
};

function renderExport(
  overrides: Partial<
    ComponentProps<typeof ExportSpecToolbar> &
      ComponentProps<typeof ExportSpecPanel>
  > = {},
) {
  const props = {
    canExport: true,
    actionsEnabled: true,
    isExporting: false,
    spec: null as typeof spec | null,
    downloadFileName: "todo-api-spec.md",
    onExport: () => undefined,
    onClear: () => undefined,
    onCopy: () => undefined,
    onDownload: () => undefined,
    ...overrides,
  };

  const closeRef: MutableRefObject<(() => void) | null> = { current: null };

  const view = render(
    <>
      <ExportSpecToolbar
        canExport={props.canExport}
        actionsEnabled={props.actionsEnabled}
        isExporting={props.isExporting}
        onExport={props.onExport}
      />
      {(props.spec || props.isExporting) && (
        <ExportSpecPanel
          spec={props.spec}
          isExporting={props.isExporting}
          downloadFileName={props.downloadFileName}
          onClear={props.onClear}
          onCopy={props.onCopy}
          onDownload={props.onDownload}
          closeRef={closeRef}
        />
      )}
    </>,
  );

  return { ...view, closeRef };
}

function clickButton(name: string | RegExp, container?: HTMLElement) {
  const root = container ? within(container) : screen;
  act(() => {
    root.getByRole("button", { name }).click();
  });
}

describe("ExportSpecToolbar", () => {
  it("shows Export Spec on a ready Project", () => {
    renderExport();
    expect(screen.getByRole("button", { name: "Export Spec" })).toBeTruthy();
  });

  it("hides Export Spec when the Project is not ready", () => {
    renderExport({ canExport: false });
    expect(screen.queryByRole("button", { name: "Export Spec" })).toBeNull();
  });

  it("disables Export Spec until the live canvas is connected", () => {
    renderExport({ actionsEnabled: false });
    expect(
      (screen.getByRole("button", { name: "Export Spec" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("asks twice before closing the exported Spec", () => {
    const onClear = vi.fn();
    const view = renderExport({ spec, onClear });
    act(() => {
      view.closeRef.current?.();
    });
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByText("Are you sure?")).toBeTruthy();

    clickButton("Yes, close", screen.getByRole("alertdialog"));
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.getByText("Have you reviewed the gaps?")).toBeTruthy();

    clickButton("Yes, I reviewed the gaps", screen.getByRole("alertdialog"));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Are you sure?")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("does not ask to close again after the Spec is dismissed", () => {
    const onClear = vi.fn();
    const view = renderExport({ spec, onClear });

    act(() => {
      view.closeRef.current?.();
    });
    clickButton("Yes, close", screen.getByRole("alertdialog"));
    clickButton("Yes, I reviewed the gaps", screen.getByRole("alertdialog"));

    view.rerender(
      <>
        <ExportSpecToolbar
          canExport
          actionsEnabled
          isExporting={false}
          onExport={() => undefined}
        />
      </>,
    );

    expect(screen.queryByText("Are you sure?")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks if gaps were reviewed before copy and download", () => {
    const onCopy = vi.fn();
    const onDownload = vi.fn();
    renderExport({ spec, onCopy, onDownload });

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

  it("renders one markdown document for the Spec and gaps", () => {
    const { container } = renderExport({ spec });

    expect(screen.getByRole("heading", { name: "Todo API" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Gaps summary" })).toBeTruthy();
    expect(screen.getByText("Users talk to the API Gateway.")).toBeTruthy();
    expect(screen.getByText("Storage is not shown on the canvas.")).toBeTruthy();
    expect(container.querySelector("pre")).toBeNull();
    expect(screen.queryByText("# Todo API")).toBeNull();
  });

  it("warns that the Spec is from the canvas at click", () => {
    renderExport({ spec });

    expect(
      screen.getByText(
        "This Spec is from the canvas when you clicked Export. Collaborators may have changed the live canvas since then. Check the canvas before you treat this as current.",
      ),
    ).toBeTruthy();
  });
});
