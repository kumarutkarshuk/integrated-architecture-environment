import type { User } from "@prisma/client";
import type { AuthClaims } from "./token-verifier.js";
import { prisma } from "../db.js";

export function getBearerToken(
  authorizationHeader: string | undefined,
): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length);
}

export async function upsertUserFromClaims(claims: AuthClaims): Promise<User> {
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
