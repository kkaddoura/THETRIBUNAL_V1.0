import { pgTable, serial, text, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const predictionsTable = pgTable("predictions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category").notNull(),
  categorySlug: text("category_slug").notNull(),
  resolvesAt: text("resolves_at"),
  yesPercentage: integer("yes_percentage").notNull().default(50),
  noPercentage: integer("no_percentage").notNull().default(50),
  totalCount: integer("total_count").notNull().default(0),
  dummyTotalCount: integer("dummy_total_count").notNull().default(0),
  dummyOptionResults: jsonb("dummy_option_results").$type<Record<string, number>>(),
  momentum: real("momentum").notNull().default(0),
  momentumDirection: text("momentum_direction").notNull().default("up"),
  trendData: jsonb("trend_data").$type<number[]>().notNull().default([]),
  cardLayout: text("card_layout").notNull().default("grid"),
  editorialStatus: text("editorial_status").notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  options: jsonb("options").$type<string[]>(),
  optionResults: jsonb("option_results").$type<Record<string, number>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPredictionSchema = createInsertSchema(predictionsTable).omit({ id: true });
export type Prediction = typeof predictionsTable.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
