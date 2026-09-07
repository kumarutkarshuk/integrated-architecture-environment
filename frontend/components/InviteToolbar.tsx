"use client";

import { useEffect, useState } from "react";
import type { ApiCollaborator } from "../lib/api";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface InviteToolbarProps {
  canInvite: boolean;
  actionsEnabled: boolean;
  isSending: boolean;
  collaborators: ApiCollaborator[];
  isLoadingCollaborators: boolean;
  resendingInviteId: string | null;
  onOpen: () => void;
  onInvite: (email: string) => void;
  onResend: (inviteId: string) => void;
}

function statusLabel(status: ApiCollaborator["status"]): string {
  return status === "joined" ? "Joined" : "Pending";
}

function resendWaitLabel(resendAvailableAt: string, now: number): string | null {
  const remainingMs = Date.parse(resendAvailableAt) - now;
  if (remainingMs <= 0) {
    return null;
  }

  const totalSec = Math.ceil(remainingMs / 1000);
  if (totalSec < 60) {
    return `Resend in ${totalSec}s`;
  }

  return `Resend in ${Math.ceil(totalSec / 60)} min`;
}

export function InviteToolbar({
  canInvite,
  actionsEnabled,
  isSending,
  collaborators,
  isLoadingCollaborators,
  resendingInviteId,
  onOpen,
  onInvite,
  onResend,
}: InviteToolbarProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const waitingToResend = collaborators.some(
    (person) =>
      person.status === "pending" &&
      !person.canResend &&
      person.resendAvailableAt !== null,
  );

  useEffect(() => {
    if (!open || !waitingToResend) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [open, waitingToResend]);

  if (!canInvite) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpen();
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      setEmail("");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }
    onInvite(trimmed);
    setEmail("");
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!actionsEnabled}
        onClick={() => handleOpenChange(true)}
      >
        Invite
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Invite a collaborator</DialogTitle>
              <DialogDescription>
                We send an email-bound link. They must sign in with that email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="editor@example.com"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Collaborators
              </p>
              {isLoadingCollaborators && collaborators.length === 0 ? (
                <p className="text-sm text-muted">Loading...</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {collaborators.map((person) => {
                    const waitLabel =
                      person.status === "pending" && person.resendAvailableAt
                        ? resendWaitLabel(person.resendAvailableAt, now)
                        : null;
                    const showResend =
                      person.status === "pending" &&
                      (person.canResend ||
                        (person.resendAvailableAt !== null && !waitLabel));

                    return (
                      <li
                        key={
                          person.status === "pending"
                            ? person.inviteId
                            : `${person.role}:${person.email}`
                        }
                        className="flex items-center justify-between gap-2 rounded-md border border-sidebar-border px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">
                            {person.displayName ?? person.email}
                          </p>
                          <p className="text-xs text-muted">
                            {person.displayName ? `${person.email} · ` : ""}
                            {statusLabel(person.status)}
                            {person.role === "owner" ? " · Owner" : ""}
                          </p>
                        </div>
                        {showResend && person.status === "pending" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={resendingInviteId === person.inviteId}
                            onClick={() => onResend(person.inviteId)}
                          >
                            {resendingInviteId === person.inviteId
                              ? "Sending..."
                              : "Resend"}
                          </Button>
                        )}
                        {person.status === "pending" &&
                          !showResend &&
                          waitLabel && (
                            <span className="shrink-0 text-xs text-muted">
                              {waitLabel}
                            </span>
                          )}
                        {person.status === "pending" &&
                          !showResend &&
                          !waitLabel && (
                            <span className="shrink-0 text-xs text-muted">
                              Resend limit reached
                            </span>
                          )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button type="submit" size="sm" disabled={isSending}>
                {isSending ? "Sending..." : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
