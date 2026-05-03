import { Router } from "express"
import { db, hustlerApplicationsTable, pollsTable, pollOptionsTable, newsletterSubscribersTable } from "@workspace/db"
import { desc, eq, sql } from "drizzle-orm"

const router = Router()

const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY && process.env.NODE_ENV === "production") {
  console.error("FATAL: ADMIN_KEY must be set in production");
  process.exit(1);
}
if (!ADMIN_KEY) {
  console.warn("[SECURITY] ADMIN_KEY is not set — using insecure dev fallback. Do NOT run this in production.");
}
const adminKey = ADMIN_KEY ?? "tmh-admin-2026-dev";

function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers["x-admin-key"]
  if (key !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  next()
}

router.get("/admin/applications", requireAdmin, async (_req, res) => {
  try {
    const apps = await db
      .select()
      .from(hustlerApplicationsTable)
      .orderBy(desc(hustlerApplicationsTable.createdAt))
      .limit(100)
    return res.json({ applications: apps })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to fetch applications" })
  }
})

router.patch("/admin/applications/:id", requireAdmin, async (req, res) => {
  const { id } = req.params
  const { editorialStatus, editorNotes } = req.body
  try {
    await db
      .update(hustlerApplicationsTable)
      .set({
        editorialStatus,
        editorNotes: editorNotes ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(hustlerApplicationsTable.id, Number(id)))
    return res.json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Update failed" })
  }
})

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const [appCount] = await db.select({ count: sql<number>`count(*)::int` }).from(hustlerApplicationsTable)
    const [subCount] = await db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribersTable)
    const [pollCount] = await db.select({ count: sql<number>`count(*)::int` }).from(pollsTable)
    const [voteCount] = await db.select({ total: sql<number>`sum(vote_count)::int` }).from(pollOptionsTable)
    const pending = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hustlerApplicationsTable)
      .where(eq(hustlerApplicationsTable.editorialStatus, "pending"))
    return res.json({
      applications: Number(appCount?.count ?? 0),
      pendingApplications: Number(pending[0]?.count ?? 0),
      subscribers: Number(subCount?.count ?? 0),
      polls: Number(pollCount?.count ?? 0),
      totalVotes: Number(voteCount?.total ?? 0),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Stats failed" })
  }
})

router.post("/admin/polls", requireAdmin, async (req, res) => {
  const { question, category, categorySlug, options, context, isFeatured, isEditorsPick } = req.body
  if (!question || !category || !options || options.length < 2) {
    return res.status(400).json({ error: "question, category, and at least 2 options are required" })
  }
  try {
    const slug = categorySlug ?? category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const [poll] = await db
      .insert(pollsTable)
      .values({
        question,
        category,
        categorySlug: slug,
        context: context ?? null,
        tags: [],
        isFeatured: isFeatured ?? false,
        isEditorsPick: isEditorsPick ?? false,
        editorialStatus: "approved",
      })
      .returning({ id: pollsTable.id })

    await db.insert(pollOptionsTable).values(
      options.map((text: string) => ({ pollId: poll.id, text, voteCount: 0 }))
    )

    return res.json({ success: true, pollId: poll.id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Failed to create poll" })
  }
})

router.patch("/admin/polls/:id/feature", requireAdmin, async (req, res) => {
  const { id } = req.params
  const { isFeatured } = req.body
  try {
    if (isFeatured) {
      await db.update(pollsTable).set({ isFeatured: false })
    }
    await db.update(pollsTable).set({ isFeatured: !!isFeatured }).where(eq(pollsTable.id, Number(id)))
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Update failed" })
  }
})

router.patch("/admin/polls/:id/editorial", requireAdmin, async (req, res) => {
  const { id } = req.params
  const { editorialStatus } = req.body
  if (!editorialStatus || !["approved", "draft", "rejected"].includes(editorialStatus)) {
    return res.status(400).json({ error: "editorialStatus must be 'approved', 'draft', or 'rejected'" })
  }
  try {
    await db.update(pollsTable).set({ editorialStatus }).where(eq(pollsTable.id, Number(id)))
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Update failed" })
  }
})

export default router
