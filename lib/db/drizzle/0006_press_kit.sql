CREATE TABLE IF NOT EXISTS "press_kit_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"content_id" integer NOT NULL,
	"template" text NOT NULL,
	"size" text NOT NULL,
	"r2_key" text NOT NULL,
	"caption_x" text,
	"caption_ig" text,
	"caption_li" text,
	"generated_by_user" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "press_kit_unique" ON "press_kit_assets" ("content_type", "content_id", "template", "size");
