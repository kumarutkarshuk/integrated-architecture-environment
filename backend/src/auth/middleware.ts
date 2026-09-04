import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import type { TokenVerifier } from "./token-verifier.js";
import { prisma } from "../db.js";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length);
}

async function upsertUserFromClaims(
  claims: Awaited<ReturnType<TokenVerifier["verify"]>>,
): Promise<User> {
  return prisma.user.upsert({
    where: { clerkId: claims.clerkId },
    create: {
      clerkId: claims.clerkId,
      email: claims.email,
      displayName: claims.displayName ?? null,
    },
    update: {
      email: claims.email,
      displayName: claims.displayName ?? null,
    },
  });
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
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}
