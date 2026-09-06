"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createInvite,
  fetchCollaborators,
  resendInvite,
  type ApiCollaborator,
  type ApiProject,
  type ApiUser,
} from "../lib/api";

export function useCreateInvite(
  project: ApiProject | null,
  user: ApiUser | null,
) {
  const { getToken } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [collaborators, setCollaborators] = useState<ApiCollaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(
    null,
  );

  const canInvite = Boolean(
    project && user && project.ownerId === user.id,
  );
  const projectId = project?.id ?? null;

  const loadCollaborators = useCallback(async () => {
    if (!projectId || !canInvite) {
      setCollaborators([]);
      return;
    }

    setIsLoadingCollaborators(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token");
      }

      setCollaborators(await fetchCollaborators(token, projectId));
    } catch (loadError) {
      toast.error(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Collaborators",
      );
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [canInvite, getToken, projectId]);

  useEffect(() => {
    setIsSending(false);
    setResendingInviteId(null);
    setCollaborators([]);
  }, [projectId]);

  useEffect(() => {
    if (!canInvite) {
      setCollaborators([]);
      return;
    }

    void loadCollaborators();
  }, [canInvite, loadCollaborators]);

  const invite = useCallback(
    async (email: string) => {
      if (!projectId || !canInvite) {
        return;
      }

      setIsSending(true);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        await createInvite(token, projectId, email);
        await loadCollaborators();
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
    [canInvite, getToken, loadCollaborators, projectId],
  );

  const resend = useCallback(
    async (inviteId: string) => {
      if (!projectId || !canInvite) {
        return;
      }

      setResendingInviteId(inviteId);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }

        await resendInvite(token, projectId, inviteId);
        await loadCollaborators();
      } catch (resendError) {
        toast.error(
          resendError instanceof Error
            ? resendError.message
            : "Failed to resend Invite",
        );
      } finally {
        setResendingInviteId(null);
      }
    },
    [canInvite, getToken, loadCollaborators, projectId],
  );

  return {
    canInvite,
    isSending,
    collaborators,
    isLoadingCollaborators,
    resendingInviteId,
    invite,
    resend,
  };
}
