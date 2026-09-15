import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor, TLStore, TLStoreWithStatus } from "tldraw";
import type { CanvasSaveStatus } from "../hooks/useYjsTldrawStore";
import { ProjectCanvas } from "./ProjectCanvas";

const { updateInstanceState } = vi.hoisted(() => ({
  updateInstanceState: vi.fn(),
}));

vi.mock("tldraw", () => ({
  Tldraw: ({
    onMount,
  }: {
    onMount?: (editor: Pick<Editor, "updateInstanceState">) => void;
  }) => {
    useEffect(() => {
      onMount?.({ updateInstanceState });
    }, [onMount]);
    return <div data-testid="live-canvas" />;
  },
}));

const syncedStore: TLStoreWithStatus = {
  status: "synced-remote",
  store: {} as TLStore,
  connectionStatus: "online",
};

function onEditorReady() {
  return undefined;
}

function canvasProps(
  saveStatus: CanvasSaveStatus,
  overrides: Partial<ComponentProps<typeof ProjectCanvas>> = {},
): ComponentProps<typeof ProjectCanvas> {
  return {
    projectName: "Todo API",
    storeWithStatus: syncedStore,
    saveStatus,
    onEditorReady,
    ...overrides,
  };
}

function renderCanvas(
  saveStatus: CanvasSaveStatus,
  overrides: Partial<ComponentProps<typeof ProjectCanvas>> = {},
) {
  return render(<ProjectCanvas {...canvasProps(saveStatus, overrides)} />);
}

describe("ProjectCanvas", () => {
  beforeEach(() => {
    updateInstanceState.mockReset();
  });

  it("makes the live canvas read-only when save status is Offline", () => {
    renderCanvas("offline");

    expect(screen.getByTestId("live-canvas")).toBeTruthy();
    expect(updateInstanceState).toHaveBeenCalledWith({ isReadonly: true });
  });

  it("keeps the live canvas editable when save status is saved", () => {
    renderCanvas("saved");

    expect(screen.getByTestId("live-canvas")).toBeTruthy();
    expect(updateInstanceState).toHaveBeenCalledWith({ isReadonly: false });
  });

  it("keeps the live canvas editable when save status is saving", () => {
    renderCanvas("saving");

    expect(screen.getByTestId("live-canvas")).toBeTruthy();
    expect(updateInstanceState).toHaveBeenCalledWith({ isReadonly: false });
  });

  it("makes the live canvas editable again when save status returns from Offline", () => {
    const view = renderCanvas("offline");
    expect(updateInstanceState).toHaveBeenCalledWith({ isReadonly: true });

    view.rerender(<ProjectCanvas {...canvasProps("saved")} />);

    expect(updateInstanceState).toHaveBeenLastCalledWith({ isReadonly: false });

    view.rerender(<ProjectCanvas {...canvasProps("offline")} />);
    expect(updateInstanceState).toHaveBeenLastCalledWith({ isReadonly: true });

    view.rerender(<ProjectCanvas {...canvasProps("saving")} />);
    expect(updateInstanceState).toHaveBeenLastCalledWith({ isReadonly: false });
  });

  it("shows a blue loading ping with canvas copy", () => {
    renderCanvas("loading", {
      storeWithStatus: { status: "loading" },
    });

    expect(screen.getByText("Loading canvas for Todo API...")).toBeTruthy();
    expect(screen.queryByTestId("live-canvas")).toBeNull();
  });

  it("shows the existing error view when the first connection fails", () => {
    renderCanvas("error", {
      storeWithStatus: {
        status: "error",
        error: new Error("Canvas sync timed out"),
      },
    });

    expect(screen.getByText("Canvas sync timed out")).toBeTruthy();
    expect(screen.queryByTestId("live-canvas")).toBeNull();
    expect(updateInstanceState).not.toHaveBeenCalled();
  });
});
