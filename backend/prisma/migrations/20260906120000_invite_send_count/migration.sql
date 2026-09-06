-- Keep one pending Invite per project + email, then cap how many times it can be sent.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, email
      ORDER BY expires_at DESC
    ) AS rn
  FROM "project_invite"
  WHERE "deleted_at" IS NULL AND "redeemed_at" IS NULL
)
UPDATE "project_invite"
SET "deleted_at" = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE "project_invite" ADD COLUMN "send_count" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "project_invite_project_id_email_idx" ON "project_invite"("project_id", "email");

CREATE UNIQUE INDEX "project_invite_project_id_email_pending_key"
ON "project_invite" ("project_id", "email")
WHERE "deleted_at" IS NULL AND "redeemed_at" IS NULL;
