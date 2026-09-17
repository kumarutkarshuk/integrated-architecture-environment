import pino from "pino";

function resolveLogLevel(): string {
  const fromEnv = process.env.LOG_LEVEL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "test") {
    return "silent";
  }
  return "info";
}

export const logger = pino({
  level: resolveLogLevel(),
  base: undefined,
});

export function childLogger(bindings: pino.Bindings): pino.Logger {
  return logger.child(bindings);
}
