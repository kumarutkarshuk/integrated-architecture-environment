ALTER TABLE "project_invite" ADD COLUMN "last_sent_at" TIMESTAMPTZ(6);

UPDATE "project_invite"
SET "last_sent_at" = CURRENT_TIMESTAMP - INTERVAL '5 minutes'
WHERE "last_sent_at" IS NULL;

ALTER TABLE "project_invite" ALTER COLUMN "last_sent_at" SET NOT NULL;
ALTER TABLE "project_invite" ALTER COLUMN "last_sent_at" SET DEFAULT CURRENT_TIMESTAMP;
