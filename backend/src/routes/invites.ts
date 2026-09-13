import { Router } from "express";
import { captureEvent } from "../analytics.js";
import type { AuthenticatedRequest } from "../auth/middleware.js";
import { redeemProjectInvite } from "../invites/service.js";

export const invitesRouter = Router();

invitesRouter.post("/:token/redeem", async (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = req.params.token?.trim();
  if (!token) {
    res.status(400).json({ error: "Invite token is required" });
    return;
  }

  const result = await redeemProjectInvite(token, user);
  if (!result.ok) {
    if (result.status === 403) {
      captureEvent(user.clerkId, "invite_redeem_failed", {
        reason: "email_mismatch",
      });
    }
    res.status(result.status).json({ error: result.error });
    return;
  }

  captureEvent(user.clerkId, "invite_redeemed", {
    projectId: result.value.projectId,
  });

  res.json(result.value);
});
