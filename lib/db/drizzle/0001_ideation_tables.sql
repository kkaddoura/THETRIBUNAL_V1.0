CREATE TABLE "ideation_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"mode" text DEFAULT 'explore' NOT NULL,
	"pillar_type" text,
	"config_snapshot" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"research_data" jsonb,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ideation_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"pillar_type" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"risk_flags" jsonb,
	"status" text DEFAULT 'generated' NOT NULL,
	"refined_content" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideation_rejection_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"idea_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"idea_title" text NOT NULL,
	"pillar_type" text NOT NULL,
	"rejection_tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideation_exclusion_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"phrase" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ideation_exclusion_list_phrase_unique" UNIQUE("phrase")
);
--> statement-breakpoint
CREATE TABLE "ideation_prompt_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"pillar_type" text NOT NULL,
	"prompt_text" text NOT NULL,
	"default_prompt_text" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ideation_prompt_templates_pillar_type_unique" UNIQUE("pillar_type")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "editorial_status" text DEFAULT 'approved' NOT NULL;
