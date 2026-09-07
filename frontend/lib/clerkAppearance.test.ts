import { dark } from "@clerk/themes";
import { describe, expect, it } from "vitest";
import { clerkAppearance } from "./clerkAppearance";

describe("clerkAppearance", () => {
  it("uses Clerk dark theme and does not follow the OS", () => {
    expect(clerkAppearance.theme).toBe(dark);
    expect(clerkAppearance.baseTheme).toBe(dark);
  });
});
