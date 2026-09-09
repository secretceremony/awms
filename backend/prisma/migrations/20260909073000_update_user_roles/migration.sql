-- AlterEnum / Update Role enum safely
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'READ_ONLY');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE
    WHEN "role"::text = 'ADMIN_LOGISTICS' THEN 'SUPER_ADMIN'::"Role_new"
    WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"Role_new"
    ELSE 'READ_ONLY'::"Role_new"
  END
);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'READ_ONLY'::"Role_new";
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
