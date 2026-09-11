-- One live Project name per owner, case-insensitive. Soft-delete frees the name.
CREATE UNIQUE INDEX "project_owner_id_lower_name_live_key"
ON "project" ("owner_id", LOWER("name"))
WHERE "deleted_at" IS NULL;
