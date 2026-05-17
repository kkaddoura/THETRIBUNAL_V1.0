-- Compose v2: decouple Layout from Slots.
-- All additive + idempotent so it can be applied to a live DB safely.
ALTER TABLE "press_kit_assets"
  ADD COLUMN IF NOT EXISTS "layout" TEXT NOT NULL DEFAULT 'single';
ALTER TABLE "press_kit_assets"
  ADD COLUMN IF NOT EXISTS "kit_id" TEXT;
ALTER TABLE "press_kit_assets"
  ADD COLUMN IF NOT EXISTS "use_ai_image" BOOLEAN NOT NULL DEFAULT FALSE;

-- A mixed carousel produces one row per (slot atom × size); kit_id groups
-- them. Index it for the assets-list lookup path.
CREATE INDEX IF NOT EXISTS "press_kit_kit_id_idx"
  ON "press_kit_assets" ("kit_id");
