export type ProductEventName =
  | "project_created"
  | "project_deleted"
  | "invite_sent"
  | "invite_resent"
  | "invite_redeemed"
  | "invite_redeem_failed"
  | "ai_generation_started"
  | "ai_generation_failed"
  | "preview_applied"
  | "spec_exported";

export interface AnalyticsEvent {
  distinctId: string;
  event: ProductEventName;
  properties?: Record<string, unknown>;
}

export interface AnalyticsException {
  error: unknown;
  distinctId?: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsIdentify {
  distinctId: string;
  properties?: Record<string, unknown>;
}

export interface Analytics {
  capture(event: AnalyticsEvent): void;
  identify(distinctId: string, properties?: Record<string, unknown>): void;
  captureException(
    error: unknown,
    distinctId?: string,
    properties?: Record<string, unknown>,
  ): void;
}

export function createTestAnalytics(): {
  analytics: Analytics;
  getEvents: () => AnalyticsEvent[];
  getExceptions: () => AnalyticsException[];
  getIdentifies: () => AnalyticsIdentify[];
  reset: () => void;
} {
  const events: AnalyticsEvent[] = [];
  const exceptions: AnalyticsException[] = [];
  const identifies: AnalyticsIdentify[] = [];

  return {
    analytics: {
      capture(event) {
        events.push({
          distinctId: event.distinctId,
          event: event.event,
          properties: event.properties ? { ...event.properties } : undefined,
        });
      },
      identify(distinctId, properties) {
        identifies.push({
          distinctId,
          properties: properties ? { ...properties } : undefined,
        });
      },
      captureException(error, distinctId, properties) {
        exceptions.push({
          error,
          distinctId,
          properties: properties ? { ...properties } : undefined,
        });
      },
    },
    getEvents: () => [...events],
    getExceptions: () => [...exceptions],
    getIdentifies: () => [...identifies],
    reset: () => {
      events.length = 0;
      exceptions.length = 0;
      identifies.length = 0;
    },
  };
}

function createNoopAnalytics(): Analytics {
  return {
    capture() {},
    identify() {},
    captureException() {},
  };
}

function createPosthogAnalytics(apiKey: string, host: string): Analytics {
  let clientPromise: Promise<import("posthog-node").PostHog> | undefined;

  async function getClient() {
    clientPromise ??= import("posthog-node").then(
      ({ PostHog }) =>
        new PostHog(apiKey, {
          host,
          disableGeoip: true,
        }),
    );
    return clientPromise;
  }

  shutdownHandler = async () => {
    if (!clientPromise) {
      return;
    }
    const client = await clientPromise;
    await client.shutdown();
  };

  return {
    capture(event) {
      void getClient()
        .then((client) => {
          client.capture({
            distinctId: event.distinctId,
            event: event.event,
            properties: event.properties,
          });
        })
        .catch((error) => {
          console.error("Analytics capture failed", error);
        });
    },
    identify(distinctId, properties) {
      void getClient()
        .then((client) => {
          client.identify({ distinctId, properties });
        })
        .catch((error) => {
          console.error("Analytics identify failed", error);
        });
    },
    captureException(error, distinctId, properties) {
      void getClient()
        .then((client) => {
          client.captureException(error, distinctId ?? "server", properties);
        })
        .catch((err) => {
          console.error("Analytics exception failed", err);
        });
    },
  };
}

function createAnalyticsFromEnv(): Analytics {
  if (process.env.NODE_ENV === "test" || !process.env.POSTHOG_API_KEY?.trim()) {
    return createNoopAnalytics();
  }

  return createPosthogAnalytics(
    process.env.POSTHOG_API_KEY.trim(),
    process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
  );
}

let shutdownHandler: () => Promise<void> = async () => {};
let activeAnalytics: Analytics = createAnalyticsFromEnv();

export function configureAnalyticsFromEnv(): void {
  shutdownHandler = async () => {};
  activeAnalytics = createAnalyticsFromEnv();
}

export function setAnalytics(analytics: Analytics): void {
  activeAnalytics = analytics;
}

export function getAnalytics(): Analytics {
  return activeAnalytics;
}

export function resetAnalytics(): void {
  shutdownHandler = async () => {};
  activeAnalytics = createAnalyticsFromEnv();
}

export async function shutdownAnalytics(): Promise<void> {
  await shutdownHandler();
}

export function captureEvent(
  distinctId: string,
  event: ProductEventName,
  properties?: Record<string, unknown>,
): void {
  try {
    getAnalytics().capture({ distinctId, event, properties });
  } catch (error) {
    console.error("Analytics capture failed", error);
  }
}

export function captureException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>,
): void {
  try {
    getAnalytics().captureException(error, distinctId, properties);
  } catch (err) {
    console.error("Analytics exception failed", err);
  }
}
