/**
 * Category settings, stored in the cms_configs row `category_settings` as
 *   { disabled: string[], custom: string[] }
 * where each entry is a category *name* (matching polls.category /
 * predictions.category). No schema migration required.
 *
 * - disabled: categories hidden from the public site (and their content).
 * - custom:   categories added in the CMS that may not yet have any content,
 *             so they still appear in the category manager and pickers.
 */
import { db, cmsConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const KEY = "category_settings";

export interface CategorySettings {
  disabled: string[];
  custom: string[];
}

function clean(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim())));
}

export async function getCategorySettings(): Promise<CategorySettings> {
  const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, KEY));
  const v = (row?.value ?? {}) as { disabled?: unknown; custom?: unknown };
  return { disabled: clean(v.disabled), custom: clean(v.custom) };
}

export async function saveCategorySettings(settings: CategorySettings): Promise<void> {
  const value = { disabled: clean(settings.disabled), custom: clean(settings.custom) };
  const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, KEY));
  if (existing) {
    await db.update(cmsConfigsTable).set({ value, updatedAt: new Date() }).where(eq(cmsConfigsTable.key, KEY));
  } else {
    await db.insert(cmsConfigsTable).values({ key: KEY, value });
  }
}

/** Convenience accessor used by the public content filters. */
export async function getDisabledCategories(): Promise<string[]> {
  return (await getCategorySettings()).disabled;
}

export async function setDisabledCategories(disabled: string[]): Promise<void> {
  const current = await getCategorySettings();
  await saveCategorySettings({ ...current, disabled });
}

export async function getCustomCategories(): Promise<string[]> {
  return (await getCategorySettings()).custom;
}

export function categorySlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
