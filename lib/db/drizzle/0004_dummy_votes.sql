ALTER TABLE "poll_options" ADD COLUMN "dummy_vote_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "predictions" ADD COLUMN "dummy_total_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "predictions" ADD COLUMN "dummy_option_results" jsonb;
