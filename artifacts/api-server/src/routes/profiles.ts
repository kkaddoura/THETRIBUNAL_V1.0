import { Router, type IRouter } from "express";
import { db, profilesTable, pollsTable, pollOptionsTable } from "@workspace/db";
import { eq, desc, sql, ilike, or, and, inArray, ne } from "drizzle-orm";

const router: IRouter = Router();

function toProfileResponse(profile: any) {
  return {
    id: profile.id,
    name: profile.name,
    headline: profile.headline,
    role: profile.role,
    company: profile.company ?? null,
    companyUrl: profile.companyUrl ?? null,
    sector: profile.sector,
    country: profile.country,
    city: profile.city,
    imageUrl: profile.imageUrl ?? null,
    isFeatured: profile.isFeatured,
    isVerified: profile.isVerified,
    viewCount: profile.viewCount,
    associatedPollCount: profile.associatedPollCount,
    quote: profile.quote ?? "",
    impactStatement: profile.impactStatement ?? null,
  };
}

router.get("/profiles", async (req, res) => {
  try {
    const { search, country, sector, filter, limit = "20", offset = "0" } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit) || 20, 200);
    const off = parseInt(offset) || 0;

    const conditions: any[] = [eq(profilesTable.editorialStatus, "approved")];
    if (search) {
      conditions.push(or(ilike(profilesTable.name, `%${search}%`), ilike(profilesTable.headline, `%${search}%`)));
    }
    if (country) conditions.push(eq(profilesTable.country, country));
    if (sector) conditions.push(eq(profilesTable.sector, sector));
    if (filter === "featured") conditions.push(eq(profilesTable.isFeatured, true));

    const whereClause = and(...conditions);

    let orderBy;
    if (filter === "most_viewed") {
      orderBy = desc(profilesTable.viewCount);
    } else if (filter === "newest") {
      orderBy = desc(profilesTable.createdAt);
    } else {
      orderBy = desc(profilesTable.isFeatured);
    }

    const profiles = await db.select().from(profilesTable).where(whereClause).orderBy(orderBy).limit(lim).offset(off);

    const total = await db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.editorialStatus, "approved"));

    res.json({ profiles: profiles.map(toProfileResponse), total: Number(total[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

router.get("/profiles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [profile] = await db.select().from(profilesTable).where(and(eq(profilesTable.id, id), eq(profilesTable.editorialStatus, "approved")));
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    await db.update(profilesTable).set({ viewCount: sql`view_count + 1` }).where(eq(profilesTable.id, id));

    const relatedPolls = await db
      .select()
      .from(pollsTable)
      .where(sql`${pollsTable.relatedProfileIds} @> ${JSON.stringify([id])}::jsonb`)
      .orderBy(desc(pollsTable.createdAt))
      .limit(4);

    const relatedPollsWithOptions = await Promise.all(
      relatedPolls.map(async (poll) => {
        const options = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, poll.id));
        const totalVotes = options.reduce((s, o) => s + o.voteCount, 0);
        const relatedProfileIds: number[] = poll.relatedProfileIds ?? [];
        const relatedProfiles = relatedProfileIds.length > 0
          ? await db
              .select({ id: profilesTable.id, name: profilesTable.name, role: profilesTable.role, company: profilesTable.company, isVerified: profilesTable.isVerified })
              .from(profilesTable)
              .where(inArray(profilesTable.id, relatedProfileIds.slice(0, 3)))
          : [];
        return {
          id: poll.id,
          question: poll.question,
          context: poll.context ?? null,
          category: poll.category,
          categorySlug: poll.categorySlug,
          tags: poll.tags ?? [],
          pollType: poll.pollType,
          options: options.map((o) => ({
            id: o.id,
            text: o.text,
            voteCount: o.voteCount,
            percentage: totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 1000) / 10 : 0,
          })),
          totalVotes,
          isFeatured: poll.isFeatured,
          isEditorsPick: poll.isEditorsPick,
          createdAt: poll.createdAt.toISOString(),
          endsAt: poll.endsAt ? poll.endsAt.toISOString() : null,
          relatedProfileIds,
          relatedProfiles,
        };
      })
    );

    const similarProfiles = await db
      .select()
      .from(profilesTable)
      .where(and(eq(profilesTable.sector, profile.sector), ne(profilesTable.id, id), eq(profilesTable.editorialStatus, "approved")))
      .limit(3);

    res.json({
      ...toProfileResponse(profile),
      summary: profile.summary,
      story: profile.story,
      lessonsLearned: profile.lessonsLearned ?? [],
      quote: profile.quote,
      impactStatement: profile.impactStatement ?? null,
      relatedPolls: relatedPollsWithOptions,
      similarProfiles: similarProfiles.map(toProfileResponse),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
