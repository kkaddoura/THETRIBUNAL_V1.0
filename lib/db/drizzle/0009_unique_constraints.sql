-- Bug B3: newsletter_subscribers needs a unique constraint so
-- `INSERT ... ON CONFLICT DO NOTHING` (no target) has a constraint to match.
ALTER TABLE "newsletter_subscribers"
  ADD CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE ("email");

-- Bug B4: poll_snapshots needs an expression-based unique index matching
-- the ON CONFLICT (poll_id, option_id, (DATE(snapshot_date))) shape.
CREATE UNIQUE INDEX IF NOT EXISTS "poll_snapshots_unique_per_day"
  ON "poll_snapshots" ("poll_id", "option_id", (DATE("snapshot_date")));
