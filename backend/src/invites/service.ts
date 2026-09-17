import { randomBytes } from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import { captureException } from "../analytics.js";
import { childLogger } from "../logger.js";

const log = childLogger({ module: "invites" });
import { lockLiveProject, notDeleted, prisma } from "../db.js";
import { findAccessibleProject, requireOwner } from "../projects/access.js";
import { getMailer } from "./mailer.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_INVITE_SENDS = 3;
export const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
export const MAX_COLLABORATORS = 20;

const inviteSelect = {
  id: true,
  email: true,
  role: true,
  sendCount: true,
  lastSentAt: true,
  expiresAt: true,
} as const;

export type InviteResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export type CollaboratorListItem =
  | {
      email: string;
      displayName: string | null;
      role: string;
      status: "joined";
    }
  | {
      email: string;
      displayName: string | null;
      role: string;
      status: "pending";
      inviteId: string;
      sendCount: number;
      canResend: boolean;
      resendAvailableAt: string | null;
    };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

function inviteOrigin(): string {
  return process.env.CORS_ORIGIN ?? "http://localhost:3000";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function resendAvailableAt(lastSentAt: Date): Date {
  return new Date(lastSentAt.getTime() + RESEND_COOLDOWN_MS);
}

function resendGate(invite: { sendCount: number; lastSentAt: Date }): InviteResult<void> {
  if (invite.sendCount >= MAX_INVITE_SENDS) {
    return {
      ok: false,
      status: 429,
      error: `Invite resend limit reached (${MAX_INVITE_SENDS} sends)`,
    };
  }

  if (resendAvailableAt(invite.lastSentAt).getTime() > Date.now()) {
    return {
      ok: false,
      status: 429,
      error: "Wait 5 minutes before resending this Invite",
    };
  }

  return { ok: true, value: undefined };
}

function inviterNameFor(user: User): string {
  const displayName = user.displayName?.trim();
  return displayName || user.email;
}

function logInviteMailFailure(user: User, error: unknown): void {
  log.error({ err: error, clerkId: user.clerkId }, "Invite email send failed");
  captureException(new Error("Failed to send Invite email"), user.clerkId, {
    source: "invite_mail",
    status: 502,
  });
}

async function sendInviteEmail(
  email: string,
  projectName: string,
  token: string,
  inviter: User,
): Promise<void> {
  await getMailer().sendInvite({
    to: email,
    projectName,
    inviteUrl: `${inviteOrigin()}/invite/${token}`,
    inviterName: inviterNameFor(inviter),
  });
}

export async function listProjectCollaborators(
  projectId: string,
  user: User,
): Promise<InviteResult<CollaboratorListItem[]>> {
  const project = await findAccessibleProject(projectId, user.id);
  if (!project) {
    const exists = await prisma.project.findFirst({
      where: { id: projectId, ...notDeleted },
    });
    return {
      ok: false,
      status: exists ? 403 : 404,
      error: "Project not found",
    };
  }

  const [collaborators, pendingInvites] = await Promise.all([
    prisma.collaborator.findMany({
      where: { projectId, ...notDeleted },
      include: {
        user: { select: { email: true, displayName: true } },
      },
    }),
    project.ownerId === user.id
      ? prisma.projectInvite.findMany({
          where: { projectId, redeemedAt: null, ...notDeleted },
        })
      : Promise.resolve([]),
  ]);

  const joinedEmails = new Set(
    collaborators.map((row) => normalizeEmail(row.user.email)),
  );

  const joined: CollaboratorListItem[] = collaborators
    .map((row) => ({
      email: row.user.email,
      displayName: row.user.displayName,
      role: row.role,
      status: "joined" as const,
    }))
    .sort((left, right) => {
      if (left.role === "owner" && right.role !== "owner") {
        return -1;
      }
      if (right.role === "owner" && left.role !== "owner") {
        return 1;
      }
      return left.email.localeCompare(right.email);
    });

  const pending: CollaboratorListItem[] = pendingInvites
    .filter((invite) => !joinedEmails.has(normalizeEmail(invite.email)))
    .map((invite) => {
      const underLimit = invite.sendCount < MAX_INVITE_SENDS;
      const availableAt = resendAvailableAt(invite.lastSentAt);
      const cooldownDone = availableAt.getTime() <= Date.now();

      return {
        email: invite.email,
        displayName: null,
        role: invite.role,
        status: "pending" as const,
        inviteId: invite.id,
        sendCount: invite.sendCount,
        canResend: underLimit && cooldownDone,
        resendAvailableAt:
          underLimit && !cooldownDone ? availableAt.toISOString() : null,
      };
    })
    .sort((left, right) => left.email.localeCompare(right.email));

  return { ok: true, value: [...joined, ...pending] };
}

type InviteDb = Pick<typeof prisma, "collaborator" | "projectInvite">;

class InviteFlowError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "InviteFlowError";
  }
}

async function projectCollaboratorCount(
  projectId: string,
  db: InviteDb = prisma,
): Promise<number> {
  const [joinedCount, pendingCount] = await Promise.all([
    db.collaborator.count({
      where: { projectId, ...notDeleted },
    }),
    db.projectInvite.count({
      where: {
        projectId,
        redeemedAt: null,
        expiresAt: { gt: new Date() },
        ...notDeleted,
      },
    }),
  ]);

  return joinedCount + pendingCount;
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
  let invite;

  try {
    invite = await prisma.$transaction(async (tx) => {
      const locked = await lockLiveProject(tx, projectId);
      if (!locked) {
        throw new InviteFlowError(404, "Project not found");
      }

      const existingCollaborator = await tx.collaborator.findFirst({
        where: {
          projectId,
          ...notDeleted,
          user: {
            email: { equals: email, mode: "insensitive" },
            ...notDeleted,
          },
        },
      });

      if (existingCollaborator) {
        throw new InviteFlowError(409, "This User is already a Collaborator");
      }

      const pendingInvite = await tx.projectInvite.findFirst({
        where: { projectId, email, redeemedAt: null, ...notDeleted },
      });

      if (pendingInvite) {
        throw new InviteFlowError(409, "An Invite was already sent to this email");
      }

      if ((await projectCollaboratorCount(projectId, tx)) >= MAX_COLLABORATORS) {
        throw new InviteFlowError(
          409,
          `Collaborator limit reached (${MAX_COLLABORATORS} per Project)`,
        );
      }

      return tx.projectInvite.create({
        data: {
          projectId,
          email,
          token,
          role: "editor",
          sendCount: 1,
          lastSentAt: new Date(),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
        select: { ...inviteSelect, token: true },
      });
    });
  } catch (error) {
    if (error instanceof InviteFlowError) {
      return { ok: false, status: error.status, error: error.message };
    }
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        status: 409,
        error: "An Invite was already sent to this email",
      };
    }
    throw error;
  }

  try {
    await sendInviteEmail(email, project.name, invite.token, user);
  } catch (error) {
    await prisma.projectInvite.update({
      where: { id: invite.id },
      data: { deletedAt: new Date() },
    });
    logInviteMailFailure(user, error);
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

export async function resendProjectInvite(
  projectId: string,
  inviteId: string,
  user: User,
): Promise<InviteResult<{ id: string; email: string; role: string; expiresAt: Date }>> {
  const access = await requireOwner(projectId, user);
  if (!access.ok) {
    return { ok: false, status: access.status, error: "Project not found" };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    select: { name: true },
  });

  if (!project) {
    return { ok: false, status: 404, error: "Project not found" };
  }

  const invite = await prisma.projectInvite.findFirst({
    where: { id: inviteId, projectId, ...notDeleted },
  });

  if (!invite) {
    return { ok: false, status: 404, error: "Invite not found" };
  }

  if (invite.redeemedAt) {
    return { ok: false, status: 409, error: "Invite has already been redeemed" };
  }

  const gate = resendGate(invite);
  if (!gate.ok) {
    return gate;
  }

  const previousToken = invite.token;
  const previousExpiresAt = invite.expiresAt;
  const previousLastSentAt = invite.lastSentAt;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const lastSentAt = new Date();
  const cooldownCutoff = new Date(Date.now() - RESEND_COOLDOWN_MS);

  const updated = await prisma.projectInvite.updateMany({
    where: {
      id: invite.id,
      projectId,
      redeemedAt: null,
      deletedAt: null,
      sendCount: { lt: MAX_INVITE_SENDS },
      lastSentAt: { lte: cooldownCutoff },
    },
    data: {
      token,
      expiresAt,
      lastSentAt,
      sendCount: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    const current = await prisma.projectInvite.findFirst({
      where: { id: invite.id, projectId, ...notDeleted },
    });
    if (!current) {
      return { ok: false, status: 404, error: "Invite not found" };
    }
    const again = resendGate(current);
    if (!again.ok) {
      return again;
    }
    return {
      ok: false,
      status: 429,
      error: "Wait 5 minutes before resending this Invite",
    };
  }

  try {
    await sendInviteEmail(invite.email, project.name, token, user);
  } catch (error) {
    await prisma.projectInvite.update({
      where: { id: invite.id },
      data: {
        token: previousToken,
        expiresAt: previousExpiresAt,
        lastSentAt: previousLastSentAt,
        sendCount: invite.sendCount,
      },
    });
    logInviteMailFailure(user, error);
    const message =
      error instanceof Error ? error.message : "Failed to send Invite email";
    return { ok: false, status: 502, error: message };
  }

  const current = await prisma.projectInvite.findFirst({
    where: { id: invite.id },
    select: inviteSelect,
  });

  if (!current) {
    return { ok: false, status: 404, error: "Invite not found" };
  }

  return {
    ok: true,
    value: {
      id: current.id,
      email: current.email,
      role: current.role,
      expiresAt: current.expiresAt,
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
    return { ok: false, status: 404, error: "This Invite is no longer valid" };
  }

  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 410, error: "This Invite is no longer valid" };
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

  try {
    await prisma.$transaction(async (tx) => {
      const marked = await tx.projectInvite.updateMany({
        where: {
          id: invite.id,
          redeemedAt: null,
          deletedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { redeemedAt: new Date() },
      });

      if (marked.count === 0) {
        throw new InviteFlowError(409, "Invite has already been redeemed");
      }

      const joinedCount = await tx.collaborator.count({
        where: { projectId: invite.projectId, ...notDeleted },
      });

      if (joinedCount >= MAX_COLLABORATORS) {
        throw new InviteFlowError(
          409,
          `Collaborator limit reached (${MAX_COLLABORATORS} per Project)`,
        );
      }

      await tx.collaborator.upsert({
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
      });
    });
  } catch (error) {
    if (error instanceof InviteFlowError) {
      const existing = await prisma.collaborator.findFirst({
        where: { projectId: invite.projectId, userId: user.id, ...notDeleted },
      });
      if (existing) {
        return { ok: true, value: { projectId: invite.projectId } };
      }
      return { ok: false, status: error.status, error: error.message };
    }
    throw error;
  }

  return { ok: true, value: { projectId: invite.projectId } };
}
