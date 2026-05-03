import { Router, type IRouter } from "express";
import { db, pollsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const ICON_MAP: Record<string, string> = {
  "arts-expression": "🎨",
  "startups-venture": "🚀",
  "business-startups": "🚀",
  "business": "🚀",
  "work-careers": "💼",
  "cities-lifestyle": "🏙️",
  "cities": "🏙️",
  "technology-ai": "🤖",
  "technology_ai": "🤖",
  "leadership": "🎯",
  "consumer-trends": "📈",
  "culture-identity": "🌍",
  "culture-society": "🌍",
  "culture_society": "🌍",
  "economy-finance": "💰",
  "economy": "💰",
  "women-in-region": "⭐",
  "women-equality": "⭐",
  "women_equality": "⭐",
  "media-influence": "📡",
  "sports-events": "🏆",
  "future-region": "🔮",
  "education-learning": "📚",
  "identity-belonging": "🧭",
  "identity": "🧭",
};

router.get("/categories", async (_req, res) => {
  try {
    // Derive categories dynamically from DB — approved polls only, summing counts across any slug variants
    const rows = await db
      .select({
        category: pollsTable.category,
        categorySlug: pollsTable.categorySlug,
        count: sql<number>`count(*)`,
      })
      .from(pollsTable)
      .where(eq(pollsTable.editorialStatus, "approved"))
      .groupBy(pollsTable.category, pollsTable.categorySlug)
      .orderBy(pollsTable.category);

    // Merge slug variants under the same category name — SUM counts, keep the slug with the most polls as canonical
    const nameMap: Record<string, { slug: string; maxSlugCount: number; totalCount: number }> = {};
    for (const row of rows) {
      const n = Number(row.count);
      const existing = nameMap[row.category];
      if (!existing) {
        nameMap[row.category] = { slug: row.categorySlug, maxSlugCount: n, totalCount: n };
      } else {
        existing.totalCount += n;
        if (n > existing.maxSlugCount) {
          existing.slug = row.categorySlug;
          existing.maxSlugCount = n;
        }
      }
    }

    const categories = Object.entries(nameMap)
      .map(([name, { slug, totalCount }]) => ({
        name,
        slug,
        icon: ICON_MAP[slug] ?? "📌",
        pollCount: totalCount,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
