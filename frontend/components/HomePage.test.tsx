import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

import { HomePage } from "./HomePage";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: false,
    isLoaded: true,
  }),
}));

describe("HomePage", () => {
  it("renders landing page hero and call to action", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /System design with code editor speed and real-time canvas/i,
      }),
    ).toBeDefined();

    expect(
      screen.getAllByRole("link", { name: /Launch Studio/i }).length,
    ).toBeGreaterThan(0);
  });
});
