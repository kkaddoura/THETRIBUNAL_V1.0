/**
 * Weekly newsletter digest log.
 *
 * One row per week, keyed by ISO week-start date. Acts as both an audit log
 * (what got pushed when) and an idempotency guard (don't double-push the
 * same week).
 *
 * Status flow: draft → pushed → sent (manual flip after Beehiiv send) | failed
 */

import {
  pgTable,
  serial,
  text,
  date,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const newsletterDigestsTable = pgTable(
  "newsletter_digests",
  {
    id: serial("id").primaryKey(),
    weekStarting: date("week_starting").notNull(),
    beehiivPostId: text("beehiiv_post_id"),
    selectedPollIds: jsonb("selected_poll_ids").$type<number[]>().notNull().default([]),
    selectedPredictionIds: jsonb("selected_prediction_ids").$type<number[]>().notNull().default([]),
    featuredVoiceId: integer("featured_voice_id"),
    introText: text("intro_text"),
    subjectLine: text("subject_line"),
    htmlBody: text("html_body"),
    status: text("status").notNull().default("draft"),
    pushedAt: timestamp("pushed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_digests_week_unique").on(t.weekStarting)],
);

export type NewsletterDigest = typeof newsletterDigestsTable.$inferSelect;
