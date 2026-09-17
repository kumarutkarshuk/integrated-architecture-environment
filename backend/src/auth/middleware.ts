import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { logger } from "../logger.js";
import type { TokenVerifier } from "./token-verifier.js";
import { getBearerToken, upsertUserFromClaims } from "./user.js";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function createAuthMiddleware(tokenVerifier: TokenVerifier) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const token = getBearerToken(req.header("authorization"));

    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const claims = await tokenVerifier.verify(token);
      req.user = await upsertUserFromClaims(claims);
      next();
    } catch (error) {
      logger.error("Auth failed", {
        error,
        path: req.originalUrl,
        method: req.method,
      });
      res.status(401).json({
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unauthorized",
      });
    }
  };
}
