import { describe, expect, it, vi } from "vitest";
import { SERVER_UNREACHABLE_MESSAGE } from "./api";
import { toastRequestError } from "./toast-errors";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { toast } from "sonner";

const toastErrorMock = vi.mocked(toast.error);

describe("toastRequestError", () => {
  it("dedupes server unreachable errors with a stable toast id", () => {
    toastRequestError(new TypeError("Failed to fetch"), "Failed to load previews");
    toastRequestError(new TypeError("Failed to fetch"), "Failed to load Collaborators");

    expect(toastErrorMock).toHaveBeenCalledTimes(2);
    expect(toastErrorMock).toHaveBeenNthCalledWith(1, SERVER_UNREACHABLE_MESSAGE, {
      id: "server-unreachable",
    });
    expect(toastErrorMock).toHaveBeenNthCalledWith(2, SERVER_UNREACHABLE_MESSAGE, {
      id: "server-unreachable",
    });
  });

  it("does not assign a toast id for other API errors", () => {
    toastRequestError(new Error("Rate limit exceeded"), "Failed to load previews");

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Rate limit exceeded",
      undefined,
    );
  });
});
