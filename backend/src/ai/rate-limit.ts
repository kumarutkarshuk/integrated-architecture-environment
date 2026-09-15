import type { AiGenerationType } from "./types.js";

const AI_DAILY_LIMITS = {
  generate: 5,
  export_spec: 10,
} as const;

export class AiRateLimitError extends Error {
  readonly kind: AiGenerationType;
  readonly status = 429;

  constructor(kind: AiGenerationType) {
    super(
      kind === "generate"
        ? "Daily generate limit reached (5 per day)"
        : "Daily Export Spec limit reached (10 per day)",
    );
    this.name = "AiRateLimitError";
    this.kind = kind;
  }
}

export interface AiRateLimiter {
  consume(userId: string, kind: AiGenerationType): Promise<"ok" | "limited">;
}

function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function rateLimitKey(
  userId: string,
  kind: AiGenerationType,
  now: Date,
): string {
  return `iae:ai:${kind}:${userId}:${utcDateKey(now)}`;
}

function secondsUntilNextUtcMidnight(now: Date): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((nextMidnight - now.getTime()) / 1000));
}

export function createMemoryAiRateLimiter(options?: {
  now?: () => Date;
}): {
  limiter: AiRateLimiter;
  getCount: (userId: string, kind: AiGenerationType) => number;
  reset: () => void;
} {
  const counts = new Map<string, number>();
  const now = options?.now ?? (() => new Date());

  return {
    limiter: {
      async consume(userId, kind) {
        const key = rateLimitKey(userId, kind, now());
        const current = counts.get(key) ?? 0;
        if (current >= AI_DAILY_LIMITS[kind]) {
          return "limited";
        }
        counts.set(key, current + 1);
        return "ok";
      },
    },
    getCount: (userId, kind) => counts.get(rateLimitKey(userId, kind, now())) ?? 0,
    reset: () => {
      counts.clear();
    },
  };
}

function createUpstashAiRateLimiter(options: {
  url: string;
  token: string;
}): AiRateLimiter {
  let redisPromise: Promise<import("@upstash/redis").Redis> | undefined;

  async function getRedis() {
    redisPromise ??= import("@upstash/redis").then(
      ({ Redis }) =>
        new Redis({
          url: options.url,
          token: options.token,
        }),
    );
    return redisPromise;
  }

  return {
    async consume(userId, kind) {
      const redis = await getRedis();
      const currentTime = new Date();
      const key = rateLimitKey(userId, kind, currentTime);
      const ttl = secondsUntilNextUtcMidnight(currentTime);
      const results = await redis.pipeline().incr(key).expire(key, ttl).exec();
      const count = Number(results[0]);
      if (count > AI_DAILY_LIMITS[kind]) {
        await redis.decr(key);
        return "limited";
      }
      return "ok";
    },
  };
}

function createUnconfiguredAiRateLimiter(): AiRateLimiter {
  return {
    async consume() {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required to enforce AI rate limits",
      );
    },
  };
}

function createAiRateLimiterFromEnv(): AiRateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return createUpstashAiRateLimiter({ url, token });
  }

  if (process.env.NODE_ENV === "production") {
    return createUnconfiguredAiRateLimiter();
  }

  return createMemoryAiRateLimiter().limiter;
}

let activeAiRateLimiter: AiRateLimiter = createAiRateLimiterFromEnv();

export function configureAiRateLimiterFromEnv(): void {
  activeAiRateLimiter = createAiRateLimiterFromEnv();
}

export function setAiRateLimiter(limiter: AiRateLimiter): void {
  activeAiRateLimiter = limiter;
}

function getAiRateLimiter(): AiRateLimiter {
  return activeAiRateLimiter;
}

export function resetAiRateLimiter(): void {
  activeAiRateLimiter = createAiRateLimiterFromEnv();
}

export async function consumeAiQuota(
  userId: string,
  kind: AiGenerationType,
): Promise<void> {
  const result = await getAiRateLimiter().consume(userId, kind);
  if (result === "limited") {
    throw new AiRateLimitError(kind);
  }
}
