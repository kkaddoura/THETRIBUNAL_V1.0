import { Router } from "express"
import { db, newsletterSubscribersTable } from "@workspace/db"

const router = Router()

export async function syncToBeehiiv(email: string, source: string) {
  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY
  const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUBLICATION_ID
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) return

  try {
    const resp = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BEEHIIV_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: source,
        utm_medium: "platform",
        utm_campaign: "tmh_capture",
      }),
    })
    if (resp.ok) {
      console.log(`[BEEHIIV] Synced: ${email.substring(0, 3)}***`)
    } else {
      const err = await resp.text()
      console.error(`[BEEHIIV] Sync failed for ${email.substring(0, 3)}***: ${err}`)
    }
  } catch (err) {
    console.error(`[BEEHIIV] Request error:`, err)
  }
}

router.post("/newsletter/subscribe", async (req, res) => {
  try {
    const { email, source = "homepage", newsletterOptIn = true } = req.body
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email required" })
    }
    const clean = email.toLowerCase().trim()
    await db.insert(newsletterSubscribersTable).values({
      email: clean,
      source,
      newsletterOptIn: !!newsletterOptIn,
    }).onConflictDoNothing()
    console.log(`[NEWSLETTER] Subscriber added: ${clean.substring(0, 3)}*** (source: ${source}, optIn: ${newsletterOptIn})`)
    if (newsletterOptIn) {
      syncToBeehiiv(clean, source).catch(() => {})
    }
    return res.json({ success: true })
  } catch (err) {
    console.error("[NEWSLETTER] Subscribe failed:", (err as Error).message)
    return res.status(500).json({ success: false, error: "Failed to subscribe. Please try again." })
  }
})

router.get("/newsletter/count", async (_req, res) => {
  try {
    const { sql } = await import("drizzle-orm")
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribersTable)
    return res.json({ count: Number(row?.count ?? 0) })
  } catch {
    return res.json({ count: 0 })
  }
})

export default router
