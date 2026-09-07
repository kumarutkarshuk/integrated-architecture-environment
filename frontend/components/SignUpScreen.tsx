"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { clerkAppearance } from "../lib/clerkAppearance";
import { signInPathFor, WORKSPACE_PATH } from "../lib/routes";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? WORKSPACE_PATH;
  const signInUrl =
    redirectUrl === WORKSPACE_PATH ? "/sign-in" : signInPathFor(redirectUrl);

  return (
    <SignUp
      appearance={clerkAppearance}
      signInUrl={signInUrl}
      forceRedirectUrl={redirectUrl}
    />
  );
}

export function SignUpScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
