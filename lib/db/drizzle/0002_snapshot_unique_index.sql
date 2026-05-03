CREATE UNIQUE INDEX "poll_snapshots_poll_option_date_unique"
  ON "poll_snapshots" ("poll_id", "option_id", (DATE("snapshot_date")));
