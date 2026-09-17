type LogContext = Record<string, unknown>;

export const logger = {
  info(message: string, context?: LogContext): void {
    if (context) {
      console.info(message, context);
      return;
    }
    console.info(message);
  },

  warn(message: string, context?: LogContext): void {
    if (context) {
      console.warn(message, context);
      return;
    }
    console.warn(message);
  },

  error(message: string, context?: LogContext): void {
    if (context) {
      console.error(message, context);
      return;
    }
    console.error(message);
  },

  debug(message: string, context?: LogContext): void {
    if (context) {
      console.debug(message, context);
      return;
    }
    console.debug(message);
  },
};
