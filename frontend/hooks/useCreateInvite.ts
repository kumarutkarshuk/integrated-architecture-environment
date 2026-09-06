"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createInvite,
  type ApiProject,
  type ApiUser,
} from "../lib/api";

export function useCreateInvite(
  project: ApiProject | null,
  user: ApiUser | null,
) {
  const { getToken } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const canInvite = Boolean(
    project && user && project.ownerId === user.id,
  );

  useEffect(() => {
    setIsSending(false);
    setSentTo(null);
  }, [project?.id]);

  const invite = useCallback(
    async (email: string) => {
      if (!project || !canInvite) {
        return;
      }

      setIsSending(true);
      setSentTo(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        const created = await createInvite(token, project.id, email);
        setSentTo(created.email);
      } catch (inviteError) {
        toast.error(
          inviteError instanceof Error
            ? inviteError.message
            : "Failed to send Invite",
        );
      } finally {
        setIsSending(false);
      }
    },
    [canInvite, getToken, project],
  );

  return {
    canInvite,
    isSending,
    sentTo,
    invite,
  };
}
