import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RightActivityBar } from "./RightActivityBar";

describe("RightActivityBar", () => {
  it("toggles the AI assistant from the right rail", () => {
    const onToggleAi = vi.fn();
    render(<RightActivityBar isAiOpen={false} onToggleAi={onToggleAi} />);

    fireEvent.click(screen.getByRole("button", { name: "AI Assistant View" }));

    expect(onToggleAi).toHaveBeenCalledTimes(1);
  });

  it("does not close the AI assistant when preview locks it open", () => {
    const onToggleAi = vi.fn();
    render(
      <RightActivityBar isAiOpen lockOpen onToggleAi={onToggleAi} />,
    );

    const button = screen.getByRole("button", { name: "AI Assistant View" });
    expect(button).toHaveProperty("disabled", true);

    fireEvent.click(button);
    expect(onToggleAi).not.toHaveBeenCalled();
  });
});
