CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_id" text NOT NULL,
	"email_verification_token" text,
	"email_verification_sent_at" timestamp,
	"password_reset_token" text,
	"password_reset_expires_at" timestamp,
	"newsletter_opt_in" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_idx" ON "users" (lower("username"));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" (lower("email"));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_idx" ON "user_sessions" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_voter_tokens" (
	"user_id" integer NOT NULL,
	"voter_token" text NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_voter_tokens_pk" PRIMARY KEY ("user_id", "voter_token")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_voter_tokens_token_unique" ON "user_voter_tokens" ("voter_token");
