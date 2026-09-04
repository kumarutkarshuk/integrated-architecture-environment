import cors from "cors";
import express from "express";
import { createAuthMiddleware } from "./auth/middleware.js";
import { createClerkTokenVerifier } from "./auth/clerk-token-verifier.js";
import { createTestTokenVerifier } from "./auth/test-token-verifier.js";
import type { AppConfig } from "./config.js";
import { aiRouter } from "./routes/ai.js";
import { projectsRouter } from "./routes/projects.js";
import { usersRouter } from "./routes/users.js";

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

  return app;
}
