"use client";

import { useState } from "react";
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
  isSending: boolean;
  sentTo: string | null;
  onInvite: (email: string) => void;
}

export function InviteToolbar({
  canInvite,
  isSending,
  sentTo,
  onInvite,
}: InviteToolbarProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  if (!canInvite) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
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
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
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

            {sentTo && (
              <p className="text-sm text-foreground">
                Invite sent to {sentTo}
              </p>
            )}

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
