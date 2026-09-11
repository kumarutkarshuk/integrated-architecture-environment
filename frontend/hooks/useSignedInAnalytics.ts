"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import {
  identifySignedInUser,
  initSignedInAnalytics,
} from "../lib/analytics";

export function useSignedInAnalytics(): void {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      return;
    }

    initSignedInAnalytics();
    identifySignedInUser(userId);
  }, [isLoaded, isSignedIn, userId]);
}
