ALTER TABLE "project_invite" ADD COLUMN "created_at" TIMESTAMPTZ(6);

UPDATE "project_invite"
SET "created_at" = "last_sent_at"
WHERE "created_at" IS NULL;

ALTER TABLE "project_invite" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "project_invite" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
