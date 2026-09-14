-- CreateTable
CREATE TABLE "rating" (
    "id" UUID NOT NULL,
    "ai_generation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rating_ai_generation_id_user_id_key" ON "rating"("ai_generation_id", "user_id");

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_ai_generation_id_fkey" FOREIGN KEY ("ai_generation_id") REFERENCES "ai_generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
