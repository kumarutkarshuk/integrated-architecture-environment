"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { fetchCurrentUser, type ApiUser } from "../lib/api";

export function useCurrentUser() {
  const { getToken, isSignedIn } = useAuth();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setUser(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const currentUser = await fetchCurrentUser(token);
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load user",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [getToken, isSignedIn]);

  return { user, isLoading, error };
}
