import { randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { notDeleted, prisma } from "../db.js";
import { requireOwner } from "../projects/access.js";
import { getMailer } from "./mailer.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inviteSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
} as const;

export type InviteResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

function inviteOrigin(): string {
  return process.env.CORS_ORIGIN ?? "http://localhost:3000";
}

export async function createProjectInvite(
  projectId: string,
  user: User,
  rawEmail: unknown,
): Promise<InviteResult<{ id: string; email: string; role: string; expiresAt: Date }>> {
  const access = await requireOwner(projectId, user);
  if (!access.ok) {
    return { ok: false, status: access.status, error: "Project not found" };
  }

  if (typeof rawEmail !== "string" || !isValidEmail(normalizeEmail(rawEmail))) {
    return { ok: false, status: 400, error: "A valid email is required" };
  }

  const email = normalizeEmail(rawEmail);
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    select: { name: true },
  });

  if (!project) {
    return { ok: false, status: 404, error: "Project not found" };
  }

  const token = randomBytes(32).toString("hex");
  const invite = await prisma.projectInvite.create({
    data: {
      projectId,
      email,
      token,
      role: "editor",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    select: { ...inviteSelect, token: true },
  });

  try {
    await getMailer().sendInvite({
      to: email,
      projectName: project.name,
      inviteUrl: `${inviteOrigin()}/invite/${invite.token}`,
    });
  } catch (error) {
    await prisma.projectInvite.delete({ where: { id: invite.id } });
    const message =
      error instanceof Error ? error.message : "Failed to send Invite email";
    return { ok: false, status: 502, error: message };
  }

  return {
    ok: true,
    value: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
  };
}

export async function redeemProjectInvite(
  token: string,
  user: User,
): Promise<InviteResult<{ projectId: string }>> {
  const invite = await prisma.projectInvite.findFirst({
    where: { token, ...notDeleted },
    include: { project: true },
  });

  if (!invite || invite.project.deletedAt) {
    return { ok: false, status: 404, error: "Invite not found" };
  }

  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 410, error: "Invite has expired" };
  }

  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    return { ok: false, status: 403, error: "Email does not match this Invite" };
  }

  if (invite.redeemedAt) {
    const existing = await prisma.collaborator.findFirst({
      where: { projectId: invite.projectId, userId: user.id, ...notDeleted },
    });

    if (existing) {
      return { ok: true, value: { projectId: invite.projectId } };
    }

    return { ok: false, status: 409, error: "Invite has already been redeemed" };
  }

  await prisma.$transaction([
    prisma.projectInvite.update({
      where: { id: invite.id },
      data: { redeemedAt: new Date() },
    }),
    prisma.collaborator.upsert({
      where: {
        projectId_userId: {
          projectId: invite.projectId,
          userId: user.id,
        },
      },
      create: {
        projectId: invite.projectId,
        userId: user.id,
        role: invite.role,
      },
      update: {
        deletedAt: null,
      },
    }),
  ]);

  return { ok: true, value: { projectId: invite.projectId } };
}
