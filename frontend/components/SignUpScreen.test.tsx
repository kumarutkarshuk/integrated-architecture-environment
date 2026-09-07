import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { clerkAppearance } from "../lib/clerkAppearance";

const signUpProps: { appearance?: unknown }[] = [];

vi.mock("@clerk/nextjs", () => ({
  SignUp: (props: { appearance?: unknown }) => {
    signUpProps.push(props);
    return <div>Sign up</div>;
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("SignUpScreen", () => {
  it("renders Clerk sign-up with the dark theme", async () => {
    const { SignUpScreen } = await import("./SignUpScreen");
    render(<SignUpScreen />);

    expect(signUpProps[0]?.appearance).toBe(clerkAppearance);
  });
});
