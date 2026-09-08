import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkAppearance } from "../lib/clerkAppearance";

interface SignInRecordedProps {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signUpUrl?: string;
}

const signInProps: SignInRecordedProps[] = [];

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: SignInRecordedProps) => {
    signInProps.push(props);
    return <div>Sign in</div>;
  },
}));

let searchParamRedirect: string | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "redirect_url" ? searchParamRedirect : null),
  }),
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    signInProps.length = 0;
    searchParamRedirect = null;
  });

  it("renders Clerk sign-in with the dark theme and defaults redirect to /workspace", async () => {
    const { SignInScreen } = await import("./SignInScreen");
    render(<SignInScreen />);

    expect(signInProps[0]?.appearance).toBe(clerkAppearance);
    expect(signInProps[0]?.forceRedirectUrl).toBe("/workspace");
  });

  it("honors redirect_url search parameter when provided", async () => {
    searchParamRedirect = "/workspace?project=project-1";
    const { SignInScreen } = await import("./SignInScreen");
    render(<SignInScreen />);

    expect(signInProps[0]?.forceRedirectUrl).toBe(
      "/workspace?project=project-1",
    );
  });
});
