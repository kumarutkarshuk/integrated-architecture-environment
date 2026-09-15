import { describe, expect, it } from "vitest";
import { isWebMcpCompatibleBrowser } from "./webmcp-support";

describe("isWebMcpCompatibleBrowser", () => {
  it("allows desktop Chrome", () => {
    expect(
      isWebMcpCompatibleBrowser({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        vendor: "Google Inc.",
      }),
    ).toBe(true);
  });

  it("rejects Firefox and mobile browsers", () => {
    expect(
      isWebMcpCompatibleBrowser({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0",
      }),
    ).toBe(false);
    expect(
      isWebMcpCompatibleBrowser({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1",
        mobile: true,
      }),
    ).toBe(false);
  });
});
