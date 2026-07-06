/**
 * CMS-protected newsletter routes (Resend delivery).
 *  - POST /api/cms/newsletter/preview    → this week's editorial issue + HTML (no send)
 *  - POST /api/cms/newsletter/send-test  → send one copy to a given address
 *  - POST /api/cms/newsletter/send-all   → send to all opted-in subscribers
 *  - GET  /api/cms/digest                → past sends (history log)
 *
 * The legacy Beehiiv push path was removed — Beehiiv's HTML send API is
 * enterprise-only; weekly delivery is via Resend (see docs/newsletter-setup.md).
 */

import { Router, type Request, type Response, type NextFunction } from "express"
import { db, cmsSessionsTable, newsletterDigestsTable } from "@workspace/db"
import { and, eq, gt, desc } from "drizzle-orm"
import { selectNewsletterContent } from "../services/newsletter-select.js"
import { buildNewsletterHtml } from "../services/newsletter-html.js"
import { sendNewsletter } from "../services/newsletter-send.js"
import { getSchedule, setSchedule } from "../services/newsletter-schedule.js"

const router = Router()

async function requireCmsAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers["x-cms-token"] as string | undefined
  if (!token) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  try {
    const [session] = await db
      .select()
      .from(cmsSessionsTable)
      .where(and(eq(cmsSessionsTable.token, token), gt(cmsSessionsTable.expiresAt, new Date())))
    if (!session) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    next()
  } catch (err) {
    console.error("[digest] auth error:", err)
    res.status(500).json({ error: "Auth check failed" })
  }
}

// ── Editorial newsletter (Resend delivery) ──────────────────────────────────

/** Preview this week's editorial issue (selection + rendered HTML). No send. */
router.post("/cms/newsletter/preview", requireCmsAuth, async (_req, res) => {
  try {
    const content = await selectNewsletterContent(new Date())
    const html = buildNewsletterHtml(content, { omitFooter: false })
    return res.json({ content, html })
  } catch (err) {
    console.error("[newsletter/preview] error:", err)
    return res.status(500).json({ error: (err as Error).message || "preview_failed" })
  }
})

/** Send a test copy to a single address (founder preview). */
router.post("/cms/newsletter/send-test", requireCmsAuth, async (req, res) => {
  try {
    const to = (req.body?.to as string | undefined)?.trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: "valid_email_required" })
    }
    const outcome = await sendNewsletter({ mode: "test", testTo: to })
    return res.json(outcome)
  } catch (err) {
    console.error("[newsletter/send-test] error:", err)
    return res.status(500).json({ error: (err as Error).message || "send_test_failed" })
  }
})

/** Send this week's issue to all opted-in subscribers. Guarded by confirm on the client. */
router.post("/cms/newsletter/send-all", requireCmsAuth, async (req, res) => {
  try {
    const force = req.body?.force === true
    const outcome = await sendNewsletter({ mode: "all", force })
    return res.json(outcome)
  } catch (err) {
    console.error("[newsletter/send-all] error:", err)
    return res.status(500).json({ error: (err as Error).message || "send_all_failed" })
  }
})

/** Read the CMS-editable weekly send schedule. */
router.get("/cms/newsletter/schedule", requireCmsAuth, async (_req, res) => {
  try {
    return res.json(await getSchedule())
  } catch (err) {
    console.error("[newsletter/schedule:get] error:", err)
    return res.status(500).json({ error: "schedule_read_failed" })
  }
})

/** Update the weekly send schedule (day/time/timezone/enabled). */
router.put("/cms/newsletter/schedule", requireCmsAuth, async (req, res) => {
  try {
    const saved = await setSchedule(req.body)
    return res.json(saved)
  } catch (err) {
    console.error("[newsletter/schedule:put] error:", err)
    return res.status(500).json({ error: "schedule_write_failed" })
  }
})

router.get("/cms/digest", requireCmsAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(newsletterDigestsTable)
    .orderBy(desc(newsletterDigestsTable.weekStarting))
    .limit(20)
  return res.json({
    digests: rows.map((r: typeof newsletterDigestsTable.$inferSelect) => ({
      id: r.id,
      weekStarting: r.weekStarting,
      subjectLine: r.subjectLine,
      status: r.status,
      pushedAt: r.pushedAt,
      beehiivPostId: r.beehiivPostId,
      pollCount: r.selectedPollIds.length,
      predictionCount: r.selectedPredictionIds.length,
    })),
  })
})

export default router
