export interface AuthClaims {
  clerkId: string;
  email: string;
  displayName?: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<AuthClaims>;
}
