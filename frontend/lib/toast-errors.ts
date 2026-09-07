import { toast } from "sonner";
import { apiErrorMessage, SERVER_UNREACHABLE_MESSAGE } from "./api";

const SERVER_UNREACHABLE_TOAST_ID = "server-unreachable";

export function toastRequestError(error: unknown, fallback: string): void {
  const message = apiErrorMessage(error, fallback);

  toast.error(
    message,
    message === SERVER_UNREACHABLE_MESSAGE
      ? { id: SERVER_UNREACHABLE_TOAST_ID }
      : undefined,
  );
}
