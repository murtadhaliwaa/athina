-- AlterTable (camelCase columns match init migration)
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "categorySnapshot" TEXT NOT NULL DEFAULT '';

-- Backfill from current menu categories for existing rows
UPDATE "order_items" AS oi
SET "categorySnapshot" = c."name"
FROM "menu_items" AS mi
INNER JOIN "categories" AS c ON c."id" = mi."categoryId"
WHERE oi."menuItemId" = mi."id"
  AND oi."categorySnapshot" = '';
