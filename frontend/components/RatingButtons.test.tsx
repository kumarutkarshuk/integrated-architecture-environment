import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RatingButtons } from "./RatingButtons";

describe("RatingButtons", () => {
  it("lights the thumb and shows saving before the save finishes", async () => {
    let finish: () => void = () => undefined;
    const onRate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    render(<RatingButtons value={null} onRate={onRate} />);

    fireEvent.click(screen.getByRole("button", { name: "Rate up" }));

    expect(onRate).toHaveBeenCalledWith("up");
    expect(screen.getByRole("button", { name: "Rate up" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("group", { name: "Rating" }).getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(screen.getByText("Saving...")).toBeTruthy();

    finish();
    await waitFor(() => {
      expect(screen.queryByText("Saving...")).toBeNull();
    });
  });
});
