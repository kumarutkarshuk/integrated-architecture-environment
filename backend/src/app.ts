import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { captureException } from "./analytics.js";
import {
  createAuthMiddleware,
  type AuthenticatedRequest,
} from "./auth/middleware.js";
import { createClerkTokenVerifier } from "./auth/clerk-token-verifier.js";
import { createTestTokenVerifier } from "./auth/test-token-verifier.js";
import type { AppConfig } from "./config.js";
import { logger } from "./logger.js";
import { aiRouter } from "./routes/ai.js";
import { invitesRouter } from "./routes/invites.js";
import { projectsRouter } from "./routes/projects.js";
import { usersRouter } from "./routes/users.js";

const handleUncaughtRouteError: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const user = (req as AuthenticatedRequest).user;
  captureException(error, user?.clerkId, { source: "uncaught", status: 500 });
  logger.error("Unhandled route error", {
    path: req.originalUrl,
    method: req.method,
    clerkId: user?.clerkId,
    error,
  });
  res.status(500).json({ error: "Internal server error" });
};

export function createApp(config: AppConfig) {
  const app = express();
  const tokenVerifier = config.isTest
    ? createTestTokenVerifier()
    : createClerkTokenVerifier(config.clerkSecretKey, [config.corsOrigin]);
  const requireAuth = createAuthMiddleware(tokenVerifier);

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/users", requireAuth, usersRouter);
  app.use("/api/projects", requireAuth, projectsRouter);
  app.use("/api/projects/:id/ai", requireAuth, aiRouter);
  app.use("/api/invites", requireAuth, invitesRouter);
  app.use(handleUncaughtRouteError);

  return app;
}
