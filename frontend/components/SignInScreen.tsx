"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { clerkAppearance } from "../lib/clerkAppearance";
import { signUpPathFor, WORKSPACE_PATH } from "../lib/routes";

function SignInForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? WORKSPACE_PATH;
  const signUpUrl =
    redirectUrl === WORKSPACE_PATH ? "/sign-up" : signUpPathFor(redirectUrl);

  return (
    <SignIn
      appearance={clerkAppearance}
      signUpUrl={signUpUrl}
      forceRedirectUrl={redirectUrl}
    />
  );
}

export function SignInScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
