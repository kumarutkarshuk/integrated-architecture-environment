import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../src/logger.js";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info messages with structured metadata", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logger.info("Backend listening", { host: "127.0.0.1", port: 4000 });

    expect(spy).toHaveBeenCalledWith("Backend listening", {
      host: "127.0.0.1",
      port: 4000,
    });
  });

  it("logs error messages with structured metadata", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error("Invite email delivery failed", {
      clerkId: "user_123",
      recipient: "editor@example.com",
      projectName: "Checkout",
      error: "SMTP rejected",
    });

    expect(spy).toHaveBeenCalledWith("Invite email delivery failed", {
      clerkId: "user_123",
      recipient: "editor@example.com",
      projectName: "Checkout",
      error: "SMTP rejected",
    });
  });
});
