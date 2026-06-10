/**
 * Category enable/disable, stored in the cms_configs row `category_settings`
 * as { disabled: string[] } where each entry is a category *name* (matching
 * polls.category / predictions.category). No schema migration required.
 *
 * Disabling a category hides it from the public category list and excludes all
 * of its debates and predictions from public listings.
 */
import { db, cmsConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const KEY = "category_settings";

export async function getDisabledCategories(): Promise<string[]> {
  const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, KEY));
  const value = (row?.value ?? {}) as { disabled?: unknown };
  return Array.isArray(value.disabled) ? value.disabled.filter((s): s is string => typeof s === "string") : [];
}

export async function setDisabledCategories(disabled: string[]): Promise<void> {
  const clean = Array.from(new Set(disabled.filter((s) => typeof s === "string" && s.trim()))).map((s) => s.trim());
  const value = { disabled: clean };
  const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, KEY));
  if (existing) {
    await db.update(cmsConfigsTable).set({ value, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, KEY));
  } else {
    await db.insert(cmsConfigsTable).values({ key: KEY, value });
  }
}
