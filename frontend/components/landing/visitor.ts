/**
 * Who is reading the landing page. `unknown` covers the moment before Clerk
 * has answered, so nothing offers the wrong door and then swaps it.
 */
export type Visitor = "unknown" | "signed-in" | "signed-out";

export function visitorFromAuth(auth: {
  isLoaded: boolean;
  isSignedIn?: boolean;
}): Visitor {
  if (!auth.isLoaded) {
    return "unknown";
  }

  return auth.isSignedIn ? "signed-in" : "signed-out";
}
