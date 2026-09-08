import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkAppearance } from "../lib/clerkAppearance";

interface SignUpRecordedProps {
  appearance?: unknown;
  forceRedirectUrl?: string;
  signInUrl?: string;
}

const signUpProps: SignUpRecordedProps[] = [];

vi.mock("@clerk/nextjs", () => ({
  SignUp: (props: SignUpRecordedProps) => {
    signUpProps.push(props);
    return <div>Sign up</div>;
  },
}));

let searchParamRedirect: string | null = null;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "redirect_url" ? searchParamRedirect : null),
  }),
}));

describe("SignUpScreen", () => {
  beforeEach(() => {
    signUpProps.length = 0;
    searchParamRedirect = null;
  });

  it("renders Clerk sign-up with the dark theme and defaults redirect to /workspace", async () => {
    const { SignUpScreen } = await import("./SignUpScreen");
    render(<SignUpScreen />);

    expect(signUpProps[0]?.appearance).toBe(clerkAppearance);
    expect(signUpProps[0]?.forceRedirectUrl).toBe("/workspace");
  });

  it("honors redirect_url search parameter when provided", async () => {
    searchParamRedirect = "/workspace?project=project-1";
    const { SignUpScreen } = await import("./SignUpScreen");
    render(<SignUpScreen />);

    expect(signUpProps[0]?.forceRedirectUrl).toBe(
      "/workspace?project=project-1",
    );
  });
});
