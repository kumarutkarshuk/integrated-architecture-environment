type SignedInAnalyticsClient = {
  identify: (distinctId: string) => void;
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

export function captureException(error: unknown): void {
  void getSignedInAnalyticsClient().then((client) => {
    client?.captureException(error);
  });
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
    captureException(error) {
      posthog.captureException(error);
    },
  };
}
