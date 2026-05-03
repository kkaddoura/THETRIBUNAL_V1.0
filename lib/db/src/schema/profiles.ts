import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  headline: text("headline").notNull(),
  role: text("role").notNull(),
  company: text("company"),
  companyUrl: text("company_url"),
  sector: text("sector").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  imageUrl: text("image_url"),
  summary: text("summary").notNull(),
  story: text("story").notNull(),
  lessonsLearned: jsonb("lessons_learned").$type<string[]>().notNull().default([]),
  quote: text("quote").notNull(),
  impactStatement: text("impact_statement"),
  editorialStatus: text("editorial_status").notNull().default("approved"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  associatedPollCount: integer("associated_poll_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true });

export type Profile = typeof profilesTable.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
