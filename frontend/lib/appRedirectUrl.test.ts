import { describe, expect, it } from "vitest";
import { toAppRedirectUrl } from "./appRedirectUrl";

describe("toAppRedirectUrl", () => {
  it("turns an Invite path into an absolute same-origin URL", () => {
    expect(toAppRedirectUrl("/invite/abc123")).toBe(
      `${window.location.origin}/invite/abc123`,
    );
  });

  it("ignores off-site redirect values", () => {
    expect(toAppRedirectUrl("https://clerk.shared.lcl.dev/invite/abc")).toBe(
      `${window.location.origin}/workspace`,
    );
    expect(toAppRedirectUrl("//clerk.shared.lcl.dev/invite/abc")).toBe(
      `${window.location.origin}/workspace`,
    );
  });
});
