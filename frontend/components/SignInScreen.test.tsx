import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkAppearance } from "../lib/clerkAppearance";

const { signInProps, searchParamsGet } = vi.hoisted(() => ({
  signInProps: [] as { appearance?: unknown; forceRedirectUrl?: string }[],
  searchParamsGet: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: { appearance?: unknown; forceRedirectUrl?: string }) => {
    signInProps.push(props);
    return <div>Sign in</div>;
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: searchParamsGet,
  }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    signInProps.length = 0;
    searchParamsGet.mockReset();
    searchParamsGet.mockReturnValue(null);
  });

  it("renders Clerk sign-in with the dark theme", async () => {
    const { SignInScreen } = await import("./SignInScreen");
    render(<SignInScreen />);

    expect(signInProps[0]?.appearance).toBe(clerkAppearance);
  });

  it("sends Clerk back to the Invite on this origin after sign-in", async () => {
    searchParamsGet.mockReturnValue("/invite/abc123");
    const { SignInScreen } = await import("./SignInScreen");
    render(<SignInScreen />);

    expect(signInProps[0]?.forceRedirectUrl).toBe(
      `${window.location.origin}/invite/abc123`,
    );
  });
});
