"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toAppRedirectUrl } from "../lib/appRedirectUrl";
import { clerkAppearance } from "../lib/clerkAppearance";

function SignInForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect_url") ?? "/workspace";
  const redirectUrl = toAppRedirectUrl(redirectPath);
  const signUpUrl =
    redirectPath === "/workspace"
      ? "/sign-up"
      : `/sign-up?redirect_url=${encodeURIComponent(redirectPath)}`;

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
