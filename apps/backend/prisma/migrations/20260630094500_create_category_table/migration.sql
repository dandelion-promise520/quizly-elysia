-- AlterTable
ALTER TABLE "Course" DROP COLUMN "categories";

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "courseId" INTEGER NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_courseId_key" ON "Category"("name", "courseId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "categoryId" INTEGER;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: Migrate legacy string categories into Category table
INSERT INTO "Category" ("name", "courseId")
SELECT DISTINCT "category", COALESCE("courseId", (SELECT "id" FROM "Course" LIMIT 1))
FROM "Question"
WHERE "category" IS NOT NULL AND "category" <> ''
ON CONFLICT DO NOTHING;

UPDATE "Question" q
SET "categoryId" = c."id"
FROM "Category" c
WHERE q."category" = c."name" AND COALESCE(q."courseId", (SELECT "id" FROM "Course" LIMIT 1)) = c."courseId";

-- AlterTable: Drop legacy category string column
ALTER TABLE "Question" DROP COLUMN "category";
