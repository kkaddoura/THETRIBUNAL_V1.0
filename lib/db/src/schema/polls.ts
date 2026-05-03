import { pgTable, serial, text, integer, boolean, timestamp, real, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  context: text("context"),
  category: text("category").notNull(),
  categorySlug: text("category_slug").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  pollType: text("poll_type").notNull().default("binary"),
  cardLayout: text("card_layout").notNull().default("standard"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isEditorsPick: boolean("is_editors_pick").notNull().default(false),
  editorialStatus: text("editorial_status").notNull().default("approved"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  relatedProfileIds: jsonb("related_profile_ids").$type<number[]>().notNull().default([]),
});

export const pollOptionsTable = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  text: text("text").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
  dummyVoteCount: integer("dummy_vote_count").notNull().default(0),
});

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  voterToken: text("voter_token").notNull(),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("votes_poll_voter_unique").on(t.pollId, t.voterToken),
]);

export const pollSnapshotsTable = pgTable("poll_snapshots", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  percentage: real("percentage").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
});

export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("share_gate"),
  pollId: integer("poll_id"),
  countryCode: text("country_code"),
  newsletterOptIn: boolean("newsletter_opt_in").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const hustlerApplicationsTable = pgTable("hustler_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  city: text("city"),
  country: text("country"),
  sector: text("sector"),
  bio: text("bio").notNull(),
  linkedin: text("linkedin").notNull(),
  quote: text("quote"),
  impact: text("impact"),
  aiScore: integer("ai_score"),
  aiStatus: text("ai_status"),
  aiReasoning: text("ai_reasoning"),
  aiChecklist: jsonb("ai_checklist"),
  editorialStatus: text("editorial_status").notNull().default("pending"),
  editorNotes: text("editor_notes"),
  wantsMajlis: boolean("wants_majlis").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertPollSchema = createInsertSchema(pollsTable).omit({ id: true });
export const insertPollOptionSchema = createInsertSchema(pollOptionsTable).omit({ id: true });
export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true });

export type Poll = typeof pollsTable.$inferSelect;
export type PollOption = typeof pollOptionsTable.$inferSelect;
export type Vote = typeof votesTable.$inferSelect;
export type PollSnapshot = typeof pollSnapshotsTable.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
