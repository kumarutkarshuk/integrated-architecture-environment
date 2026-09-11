"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toAppRedirectUrl } from "../lib/appRedirectUrl";
import { clerkAppearance } from "../lib/clerkAppearance";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect_url") ?? "/workspace";
  const redirectUrl = toAppRedirectUrl(redirectPath);
  const signInUrl =
    redirectPath === "/workspace"
      ? "/sign-in"
      : `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`;

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
