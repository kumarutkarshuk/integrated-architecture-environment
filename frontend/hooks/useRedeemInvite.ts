"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { redeemInvite } from "../lib/api";

export function useRedeemInvite(inviteToken: string, enabled: boolean) {
  const { getToken } = useAuth();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;
    setProjectId(null);
    setError(null);
    setIsRedeeming(false);
  }, [inviteToken]);

  useEffect(() => {
    if (!enabled || !inviteToken || startedRef.current) {
      return;
    }

    startedRef.current = true;
    setIsRedeeming(true);
    setError(null);

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const redeemed = await redeemInvite(token, inviteToken);
        setProjectId(redeemed.projectId);
      } catch (redeemError) {
        setError(
          redeemError instanceof Error
            ? redeemError.message
            : "Failed to redeem Invite",
        );
      } finally {
        setIsRedeeming(false);
      }
    })();
  }, [enabled, getToken, inviteToken]);

  return {
    isRedeeming,
    projectId,
    error,
  };
}
