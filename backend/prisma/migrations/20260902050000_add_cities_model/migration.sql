-- CreateTable
CREATE TABLE IF NOT EXISTS "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cities_code_key" ON "cities"("code");

-- Pre-seed BPN and JKT
INSERT INTO "cities" ("name", "code", "is_active", "created_at", "updated_at")
VALUES
    ('Balikpapan', 'BPN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Jakarta', 'JKT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
