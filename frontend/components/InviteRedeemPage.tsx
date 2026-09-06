"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRedeemInvite } from "../hooks/useRedeemInvite";

interface InviteRedeemPageProps {
  token: string;
}

const EMAIL_MISMATCH_ERROR = "Email does not match this Invite";

export function InviteRedeemPage({ token }: InviteRedeemPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const redeem = useRedeemInvite(token, Boolean(isLoaded && isSignedIn));

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(
        `/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`,
      );
    }
  }, [isLoaded, isSignedIn, router, token]);

  useEffect(() => {
    if (redeem.projectId) {
      router.replace(`/?project=${redeem.projectId}`);
    }
  }, [redeem.projectId, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        Sign in to redeem this Invite...
      </div>
    );
  }

  if (redeem.error) {
    const isEmailMismatch = redeem.error === EMAIL_MISMATCH_ERROR;

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center text-foreground">
        <p className="text-red-400">{redeem.error}</p>
        {isEmailMismatch && (
          <p className="text-sm text-muted">
            Sign in with the email this Invite was sent to.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      {redeem.isRedeeming ? "Redeeming Invite..." : "Opening project..."}
    </div>
  );
}
