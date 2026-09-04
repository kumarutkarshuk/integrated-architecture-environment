import type { AuthClaims, TokenVerifier } from "./token-verifier.js";

const TEST_PREFIX = "test:";

export function createTestTokenVerifier(): TokenVerifier {
  return {
    async verify(token: string): Promise<AuthClaims> {
      if (!token.startsWith(TEST_PREFIX)) {
        throw new Error("Invalid test token");
      }

      const claims = JSON.parse(token.slice(TEST_PREFIX.length)) as AuthClaims;

      if (!claims.clerkId || !claims.email) {
        throw new Error("Invalid test token claims");
      }

      return claims;
    },
  };
}

export function createTestAuthHeader(claims: AuthClaims): string {
  return `Bearer test:${JSON.stringify(claims)}`;
}
