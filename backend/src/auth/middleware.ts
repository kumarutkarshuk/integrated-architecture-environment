import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import type { TokenVerifier } from "./token-verifier.js";
import { childLogger } from "../logger.js";
import { getBearerToken, upsertUserFromClaims } from "./user.js";

const log = childLogger({ module: "auth" });

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
      log.warn({ err: error }, "Auth failed");
      res.status(401).json({
        error:
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unauthorized",
      });
    }
  };
}
