import { verifyToken } from "@clerk/backend";
import type { AuthClaims, TokenVerifier } from "./token-verifier.js";

export function createClerkTokenVerifier(secretKey: string): TokenVerifier {
  return {
    async verify(token: string): Promise<AuthClaims> {
      const payload = await verifyToken(token, { secretKey });

      const clerkId = payload.sub;
      const email =
        typeof payload.email === "string"
          ? payload.email
          : typeof payload.primary_email_address === "string"
            ? payload.primary_email_address
            : undefined;

      if (!clerkId || !email) {
        throw new Error("Invalid token claims");
      }

      const displayName =
        typeof payload.name === "string"
          ? payload.name
          : typeof payload.full_name === "string"
            ? payload.full_name
            : undefined;

      return { clerkId, email, displayName };
    },
  };
}
