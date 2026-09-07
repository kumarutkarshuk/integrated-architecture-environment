import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { clerkAppearance } from "../lib/clerkAppearance";

const signInProps: { appearance?: unknown }[] = [];

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: { appearance?: unknown }) => {
    signInProps.push(props);
    return <div>Sign in</div>;
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("SignInScreen", () => {
  it("renders Clerk sign-in with the dark theme", async () => {
    const { SignInScreen } = await import("./SignInScreen");
    render(<SignInScreen />);

    expect(signInProps[0]?.appearance).toBe(clerkAppearance);
  });
});
