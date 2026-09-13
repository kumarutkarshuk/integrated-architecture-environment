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
  it("toggles the project sidebar and shows the account control", () => {
    const onToggleProjects = vi.fn();
    render(
      <ActivityBar isProjectsOpen onToggleProjects={onToggleProjects} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Explorer View" }));

    expect(onToggleProjects).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "AI panel View" })).toBeNull();
    expect(screen.getByText("Account")).toBeTruthy();
    expect(userButtonProps[0]?.appearance).toMatchObject({
      theme: clerkAppearance.theme,
      elements: {
        rootBox: "flex items-center justify-center",
        avatarBox: "h-7 w-7 cursor-pointer",
      },
    });
    expect(userButtonProps[0]?.afterSignOutUrl).toBe("/");
  });
});
