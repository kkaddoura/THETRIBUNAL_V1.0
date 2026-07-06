/**
 * General user accounts (login/signup, vote attribution, public profile).
 *
 * Distinct from:
 *  - cms_sessions / CMS admin (single-tenant founder access)
 *  - majlis_invites / Majlis users (invite-only chat, profile-bound)
 *
 * Auth shape:
 *  - login credential = username + password
 *  - email is mandatory at signup (used for verification, password reset, newsletter)
 *  - avatar is one of 12 pre-rendered IDs (avatar-01 .. avatar-12)
 *
 * Vote merging:
 *  - existing votes table keeps voter_token as truth
 *  - user_voter_tokens links each user to one or more device tokens
 *  - "current device's voter_token" auto-links to the user on signup
 *  - subsequent logins on new devices auto-link those tokens too
 *  - duplicate votes silently keep the earliest (no toast, no surfacing)
 */

import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    passwordHash: text("password_hash").notNull(),
    avatarId: text("avatar_id").notNull(),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationSentAt: timestamp("email_verification_sent_at"),
    passwordResetToken: text("password_reset_token"),
    passwordResetExpiresAt: timestamp("password_reset_expires_at"),
    newsletterOptIn: boolean("newsletter_opt_in").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => [
    uniqueIndex("users_username_lower_idx").on(t.username),
    uniqueIndex("users_email_lower_idx").on(t.email),
  ],
);

export const userSessionsTable = pgTable("user_sessions", {
  token: text("token").primaryKey(),
  userId: serial("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const userVoterTokensTable = pgTable(
  "user_voter_tokens",
  {
    userId: serial("user_id").notNull(),
    voterToken: text("voter_token").notNull(),
    linkedAt: timestamp("linked_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_voter_tokens_token_unique").on(t.voterToken),
    uniqueIndex("user_voter_tokens_pk").on(t.userId, t.voterToken),
  ],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type UserSession = typeof userSessionsTable.$inferSelect;
export type UserVoterToken = typeof userVoterTokensTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
