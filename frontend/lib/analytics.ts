export type ClientProductEventName =
  | "mcp_config_copied"
  | "agent_allowed"
  | "agent_disallowed"
  | "agent_arm_conflict"
  | "webmcp_tool_used";

type SignedInAnalyticsClient = {
  identify: (distinctId: string) => void;
  capture: (
    event: ClientProductEventName,
    properties?: Record<string, unknown>,
  ) => void;
  captureException: (error: unknown) => void;
};

let clientPromise: Promise<SignedInAnalyticsClient | null> | null = null;

export function initSignedInAnalytics(): void {
  void getSignedInAnalyticsClient();
}

export function identifySignedInUser(clerkId: string): void {
  void getSignedInAnalyticsClient().then((client) => {
    client?.identify(clerkId);
  });
}

export function captureProductEvent(
  event: ClientProductEventName,
  properties?: Record<string, unknown>,
): void {
  void getSignedInAnalyticsClient()
    .then((client) => {
      client?.capture(event, properties);
    })
    .catch((error) => {
      console.error("Analytics capture failed", error);
    });
}

export function captureException(error: unknown): void {
  void getSignedInAnalyticsClient().then((client) => {
    client?.captureException(error);
  });
}

export function resetSignedInAnalytics(): void {
  clientPromise = null;
}

function getSignedInAnalyticsClient(): Promise<SignedInAnalyticsClient | null> {
  clientPromise ??= loadSignedInPosthog();
  return clientPromise;
}

async function loadSignedInPosthog(): Promise<SignedInAnalyticsClient | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) {
    return null;
  }

  const posthog = (await import("posthog-js")).default;
  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
        "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      capture_exceptions: true,
      disable_session_recording: true,
      person_profiles: "identified_only",
    });
  }

  return {
    identify(distinctId) {
      posthog.identify(distinctId);
    },
    capture(event, properties) {
      posthog.capture(event, properties);
    },
    captureException(error) {
      posthog.captureException(error);
    },
  };
}
