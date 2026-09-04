import { createClerkClient, verifyToken } from "@clerk/backend";
import type { AuthClaims, TokenVerifier } from "./token-verifier.js";

function readDisplayName(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.name === "string") {
    return payload.name;
  }

  if (typeof payload.full_name === "string") {
    return payload.full_name;
  }

  return undefined;
}

function readEmail(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.email === "string") {
    return payload.email;
  }

  if (typeof payload.primary_email_address === "string") {
    return payload.primary_email_address;
  }

  return undefined;
}

export function createClerkTokenVerifier(
  secretKey: string,
  authorizedParties: string[] = [],
): TokenVerifier {
  const clerk = createClerkClient({ secretKey });

  return {
    async verify(token: string): Promise<AuthClaims> {
      const payload = (await verifyToken(token, {
        secretKey,
        authorizedParties:
          authorizedParties.length > 0 ? authorizedParties : undefined,
      })) as Record<string, unknown>;

      const clerkId = typeof payload.sub === "string" ? payload.sub : undefined;

      if (!clerkId) {
        throw new Error("Invalid token claims");
      }

      let email = readEmail(payload);
      let displayName = readDisplayName(payload);

      if (!email) {
        const user = await clerk.users.getUser(clerkId);
        email = user.primaryEmailAddress?.emailAddress;

        if (!displayName) {
          const name = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();
          displayName = name || undefined;
        }
      }

      if (!email) {
        throw new Error("Invalid token claims");
      }

      return { clerkId, email, displayName };
    },
  };
}
