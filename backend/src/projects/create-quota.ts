import { INCR_IF_BELOW_LUA } from "../redis-counter.js";

const PROJECT_CREATE_DAILY_LIMIT = 10;

export class ProjectCreateRateLimitError extends Error {
  readonly status = 429;

  constructor() {
    super("Daily Project create limit reached (10 per day)");
    this.name = "ProjectCreateRateLimitError";
  }
}

export interface ProjectCreateRateLimiter {
  peek(userId: string): Promise<"ok" | "limited">;
  consume(userId: string): Promise<"ok" | "limited">;
}

function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function rateLimitKey(userId: string, now: Date): string {
  return `iae:project:create:${userId}:${utcDateKey(now)}`;
}

function secondsUntilNextUtcMidnight(now: Date): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((nextMidnight - now.getTime()) / 1000));
}

export function createMemoryProjectCreateRateLimiter(options?: {
  now?: () => Date;
}): {
  limiter: ProjectCreateRateLimiter;
  getCount: (userId: string) => number;
  reset: () => void;
} {
  const counts = new Map<string, number>();
  const now = options?.now ?? (() => new Date());

  return {
    limiter: {
      async peek(userId) {
        const key = rateLimitKey(userId, now());
        const count = counts.get(key) ?? 0;
        return count >= PROJECT_CREATE_DAILY_LIMIT ? "limited" : "ok";
      },
      async consume(userId) {
        const key = rateLimitKey(userId, now());
        const current = counts.get(key) ?? 0;
        if (current >= PROJECT_CREATE_DAILY_LIMIT) {
          return "limited";
        }
        counts.set(key, current + 1);
        return "ok";
      },
    },
    getCount: (userId) => counts.get(rateLimitKey(userId, now())) ?? 0,
    reset: () => {
      counts.clear();
    },
  };
}

function createUpstashProjectCreateRateLimiter(options: {
  url: string;
  token: string;
}): ProjectCreateRateLimiter {
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
    async peek(userId) {
      const redis = await getRedis();
      const key = rateLimitKey(userId, new Date());
      const count = Number((await redis.get(key)) ?? 0);
      return count >= PROJECT_CREATE_DAILY_LIMIT ? "limited" : "ok";
    },
    async consume(userId) {
      const redis = await getRedis();
      const currentTime = new Date();
      const key = rateLimitKey(userId, currentTime);
      const ttl = secondsUntilNextUtcMidnight(currentTime);
      const count = Number(
        await redis.eval(
          INCR_IF_BELOW_LUA,
          [key],
          [PROJECT_CREATE_DAILY_LIMIT, ttl],
        ),
      );
      if (count > PROJECT_CREATE_DAILY_LIMIT) {
        return "limited";
      }
      return "ok";
    },
  };
}

function createUnconfiguredProjectCreateRateLimiter(): ProjectCreateRateLimiter {
  return {
    async peek() {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required to enforce Project create limits",
      );
    },
    async consume() {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required to enforce Project create limits",
      );
    },
  };
}

function createProjectCreateRateLimiterFromEnv(): ProjectCreateRateLimiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return createUpstashProjectCreateRateLimiter({ url, token });
  }

  if (process.env.NODE_ENV === "production") {
    return createUnconfiguredProjectCreateRateLimiter();
  }

  return createMemoryProjectCreateRateLimiter().limiter;
}

let activeProjectCreateRateLimiter: ProjectCreateRateLimiter =
  createProjectCreateRateLimiterFromEnv();

export function configureProjectCreateRateLimiterFromEnv(): void {
  activeProjectCreateRateLimiter = createProjectCreateRateLimiterFromEnv();
}

export function setProjectCreateRateLimiter(
  limiter: ProjectCreateRateLimiter,
): void {
  activeProjectCreateRateLimiter = limiter;
}

function getProjectCreateRateLimiter(): ProjectCreateRateLimiter {
  return activeProjectCreateRateLimiter;
}

export function resetProjectCreateRateLimiter(): void {
  activeProjectCreateRateLimiter = createProjectCreateRateLimiterFromEnv();
}

export async function peekProjectCreateQuota(userId: string): Promise<void> {
  const result = await getProjectCreateRateLimiter().peek(userId);
  if (result === "limited") {
    throw new ProjectCreateRateLimitError();
  }
}

export async function consumeProjectCreateQuota(userId: string): Promise<void> {
  const result = await getProjectCreateRateLimiter().consume(userId);
  if (result === "limited") {
    throw new ProjectCreateRateLimitError();
  }
}
