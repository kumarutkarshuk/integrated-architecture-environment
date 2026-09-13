import { createApp } from "./app.js";
import { configureAnalyticsFromEnv, captureException, shutdownAnalytics } from "./analytics.js";
import { configureAiRateLimiterFromEnv } from "./ai/rate-limit.js";
import { loadConfig } from "./config.js";
import { configureMailerFromEnv } from "./invites/mailer.js";
import { configureProjectCreateRateLimiterFromEnv } from "./projects/create-quota.js";
import { createHttpServer } from "./server.js";

const config = loadConfig();
configureAnalyticsFromEnv();
configureMailerFromEnv();
configureAiRateLimiterFromEnv();
configureProjectCreateRateLimiterFromEnv();
const app = createApp(config);
const server = createHttpServer(app, config);

function captureProcessError(error: unknown) {
  captureException(error, "server");
  console.error(error);
}

process.on("uncaughtException", (error) => {
  captureProcessError(error);
  void shutdownAnalytics().finally(() => {
    process.exit(1);
  });
});

process.on("unhandledRejection", (reason) => {
  captureProcessError(reason);
});

server.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
