"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { clerkAppearance } from "../lib/clerkAppearance";

function SignInForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? "/workspace";
  const signUpUrl =
    redirectUrl === "/workspace"
      ? "/sign-up"
      : `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`;

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
