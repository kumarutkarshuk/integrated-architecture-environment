"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? "/";
  const signInUrl =
    redirectUrl === "/"
      ? "/sign-in"
      : `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`;

  return <SignUp signInUrl={signInUrl} forceRedirectUrl={redirectUrl} />;
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
