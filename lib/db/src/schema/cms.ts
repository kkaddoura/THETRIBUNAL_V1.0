import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cmsConfigsTable = pgTable("cms_configs", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const designTokensTable = pgTable("design_tokens", {
  id: serial("id").primaryKey(),
  tokenType: text("token_type").notNull().default("color"),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  category: text("category"),
  sortOrder: serial("sort_order"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cmsSessionsTable = pgTable("cms_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertCmsConfigSchema = createInsertSchema(cmsConfigsTable).omit({ id: true });
export const insertDesignTokenSchema = createInsertSchema(designTokensTable).omit({ id: true });

export type CmsConfig = typeof cmsConfigsTable.$inferSelect;
export type DesignToken = typeof designTokensTable.$inferSelect;
export type CmsSession = typeof cmsSessionsTable.$inferSelect;
export type InsertCmsConfig = z.infer<typeof insertCmsConfigSchema>;
export type InsertDesignToken = z.infer<typeof insertDesignTokenSchema>;
