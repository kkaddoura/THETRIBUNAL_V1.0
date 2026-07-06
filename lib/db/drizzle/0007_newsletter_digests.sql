CREATE TABLE IF NOT EXISTS "newsletter_digests" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_starting" date NOT NULL,
	"beehiiv_post_id" text,
	"selected_poll_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_prediction_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured_voice_id" integer,
	"intro_text" text,
	"subject_line" text,
	"html_body" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"pushed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_digests_week_unique" ON "newsletter_digests" ("week_starting");
