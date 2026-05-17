import { Router } from "express"
import { db, newsletterSubscribersTable } from "@workspace/db"
import { eq, sql } from "drizzle-orm"
import { signUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "../lib/unsubscribe.js"

const router = Router()

export { signUnsubscribeToken, unsubscribeUrl } // re-export so callers in other routes can build links

export async function syncToBeehiiv(email: string, source: string): Promise<void> {
  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY
  const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUBLICATION_ID
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUB_ID) {
    console.log(`[BEEHIIV-DEV] would sync ${email.substring(0, 3)}*** (source: ${source}) — keys missing`)
    return
  }

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

/**
 * Mirror an unsubscribe to Beehiiv. Looks up the subscription by email then
 * PATCHes with `{unsubscribe: true}`. Best-effort: silently no-ops if keys
 * are missing or the lookup fails.
 */
export async function unsubscribeFromBeehiiv(email: string): Promise<void> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const pubId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !pubId) {
    console.log(`[BEEHIIV-DEV] would unsubscribe ${email.substring(0, 3)}*** — keys missing`)
    return
  }
  try {
    const listUrl = `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions?email=${encodeURIComponent(email)}`
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!listRes.ok) {
      console.warn(`[BEEHIIV] unsubscribe lookup failed (${listRes.status}) for ${email.substring(0, 3)}***`)
      return
    }
    const body = (await listRes.json()) as { data?: Array<{ id: string }> }
    const subs = body.data ?? []
    if (subs.length === 0) {
      console.log(`[BEEHIIV] unsubscribe: no Beehiiv subscription for ${email.substring(0, 3)}***`)
      return
    }
    for (const sub of subs) {
      const patchRes = await fetch(`https://api.beehiiv.com/v2/publications/${pubId}/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ unsubscribe: true }),
      })
      if (!patchRes.ok) {
        console.warn(`[BEEHIIV] unsubscribe PATCH ${sub.id} failed (${patchRes.status}) for ${email.substring(0, 3)}***`)
      } else {
        console.log(`[BEEHIIV] Unsubscribed ${email.substring(0, 3)}*** (sub ${sub.id})`)
      }
    }
  } catch (err) {
    console.error("[BEEHIIV] Unsubscribe error:", err)
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
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribersTable)
    return res.json({ count: Number(row?.count ?? 0) })
  } catch {
    return res.json({ count: 0 })
  }
})

// ── Unsubscribe ──────────────────────────────────────────────
// GET shows a confirmation page (people clicking the link from their inbox).
// POST is RFC 8058 one-click; called by email clients (Gmail/Yahoo) when the
// user clicks the native "Unsubscribe" affordance in the inbox UI.

router.get("/newsletter/unsubscribe", async (req, res) => {
  const verify = verifyUnsubscribeToken(req.query.token as string | undefined)
  if (!verify.ok || !verify.email) {
    return res.status(400).type("html").send(renderUnsubscribePage({
      ok: false,
      title: "Invalid unsubscribe link",
      body: "This unsubscribe link is invalid or has been tampered with. If you keep receiving emails you didn't sign up for, reply to one and we'll remove you manually.",
    }))
  }
  try {
    const result = await applyUnsubscribe(verify.email)
    return res.status(200).type("html").send(renderUnsubscribePage({
      ok: true,
      title: "You're unsubscribed.",
      body: result.found
        ? `${verify.email} won't receive any more emails from The Tribunal. Took effect just now.`
        : `We couldn't find a subscription for ${verify.email}, so there's nothing to unsubscribe — but you're definitely off the list.`,
    }))
  } catch (err) {
    console.error("[NEWSLETTER] Unsubscribe error:", err)
    return res.status(500).type("html").send(renderUnsubscribePage({
      ok: false,
      title: "Something went wrong.",
      body: "We hit an error processing your unsubscribe. Please try again, or reply to one of our emails and we'll remove you manually.",
    }))
  }
})

router.post("/newsletter/unsubscribe", async (req, res) => {
  const verify = verifyUnsubscribeToken(req.query.token as string | undefined)
  if (!verify.ok || !verify.email) {
    return res.status(400).json({ ok: false, error: "invalid_token" })
  }
  try {
    const result = await applyUnsubscribe(verify.email)
    return res.json({ ok: true, found: result.found })
  } catch (err) {
    console.error("[NEWSLETTER] One-click unsubscribe error:", err)
    return res.status(500).json({ ok: false, error: "server_error" })
  }
})

async function applyUnsubscribe(email: string): Promise<{ found: boolean }> {
  const clean = email.toLowerCase().trim()
  const result = await db
    .update(newsletterSubscribersTable)
    .set({ newsletterOptIn: false, unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribersTable.email, clean))
    .returning({ id: newsletterSubscribersTable.id })
  // Best-effort: mirror to Beehiiv (no await on the caller's path).
  void unsubscribeFromBeehiiv(clean).catch(() => {})
  return { found: result.length > 0 }
}

function renderUnsubscribePage(opts: { ok: boolean; title: string; body: string }): string {
  const accent = opts.ok ? "#DC143C" : "#9A9690"
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<style>
body { margin: 0; padding: 0; background: #0A0A0A; color: #F2EDE4; font-family: 'Helvetica Neue', Arial, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.card { max-width: 480px; padding: 40px 32px; border: 1px solid #2A2A2A; background: #0D0D0D; text-align: center; }
.kicker { color: ${accent}; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; font-weight: 700; margin: 0 0 16px; }
h1 { margin: 0 0 16px; font-size: 26px; line-height: 1.2; }
p { color: #C3BDB1; font-size: 15px; line-height: 1.55; margin: 0; }
a { display: inline-block; margin-top: 24px; color: #F2EDE4; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; border-bottom: 2px solid ${accent}; padding-bottom: 2px; }
</style>
</head>
<body>
<div class="card">
  <p class="kicker">The Tribunal</p>
  <h1>${escapeHtml(opts.title)}</h1>
  <p>${escapeHtml(opts.body)}</p>
  <a href="${(process.env.APP_URL ?? "https://themiddleeasthustle.com").replace(/\/+$/, "")}">Back to themiddleeasthustle.com</a>
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export default router
