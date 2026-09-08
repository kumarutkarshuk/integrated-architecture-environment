import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { clerkAppearance } from "../lib/clerkAppearance";
import { ActivityBar } from "./ActivityBar";

const userButtonProps: { appearance?: unknown; afterSignOutUrl?: string }[] =
  [];

vi.mock("@clerk/nextjs", () => ({
  UserButton: (props: { appearance?: unknown; afterSignOutUrl?: string }) => {
    userButtonProps.push(props);
    return <div>Account</div>;
  },
}));

describe("ActivityBar", () => {
  it("toggles sidebars and shows the account control", () => {
    const onToggleProjects = vi.fn();
    const onToggleAi = vi.fn();
    render(
      <ActivityBar
        isProjectsOpen
        onToggleProjects={onToggleProjects}
        isAiOpen={false}
        onToggleAi={onToggleAi}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Explorer View" }));
    fireEvent.click(screen.getByRole("button", { name: "AI Assistant View" }));

    expect(onToggleProjects).toHaveBeenCalledTimes(1);
    expect(onToggleAi).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Account")).toBeTruthy();
    expect(userButtonProps[0]?.appearance).toMatchObject({
      theme: clerkAppearance.theme,
    });
    expect(userButtonProps[0]?.afterSignOutUrl).toBe("/");
  });
});
