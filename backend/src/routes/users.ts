import { Router } from "express";
import type { AuthenticatedRequest } from "../auth/middleware.js";

export const usersRouter = Router();

usersRouter.get("/me", (req, res) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  });
});
