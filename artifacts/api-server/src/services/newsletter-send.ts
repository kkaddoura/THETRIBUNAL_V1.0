/**
 * Weekly newsletter delivery via Resend (production sender — Beehiiv's HTML
 * push API is enterprise-only, so we send from our own subscriber list).
 *
 *  - test mode: render + send to a single address (founder preview).
 *  - all mode:  send to every opted-in subscriber in our DB, with a signed
 *    one-click unsubscribe link per recipient. Idempotent per ISO week.
 *
 * The send log reuses the existing `newsletter_digests` table (no migration).
 */

import { db, newsletterSubscribersTable, newsletterDigestsTable } from "@workspace/db"
import { and, eq, isNull, desc } from "drizzle-orm"
import { sendEmail } from "../lib/email.js"
import { signUnsubscribeToken } from "../lib/unsubscribe.js"
import { selectNewsletterContent } from "./newsletter-select.js"
import { buildNewsletterHtml, type NewsletterContent } from "./newsletter-html.js"
import { sanitize } from "./newsletter-lint.js"

const APP_URL = (process.env.APP_URL || "https://themiddleeasthustle.com").replace(/\/+$/, "")
// Production sender. Requires thetribunal.me verified in Resend. For preview
// sends before verification, pass `from` override (e.g. onboarding@resend.dev).
const NEWSLETTER_FROM = process.env.NEWSLETTER_FROM || "The Tribunal <newsletter@thetribunal.me>"

function unsubUrl(email: string): string {
  return `${APP_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email))}`
}

function isoWeekStart(d: Date): string {
  // Friday-anchored, matching the existing digest convention.
  const day = d.getUTCDay()
  const offset = (day + 7 - 5) % 7
  const friday = new Date(d.getTime() - offset * 24 * 60 * 60 * 1000)
  return friday.toISOString().slice(0, 10)
}

export interface SendOutcome {
  mode: "test" | "all"
  weekStarting: string
  subjectLine: string
  attempted: number
  sent: number
  failed: number
  skippedAlreadySent?: boolean
  sampleError?: string
}

function lintContent(c: NewsletterContent): NewsletterContent {
  // Final safety net — guarantee no banned phrase ships, even though selection
  // already hedges. Subject + takeaways are the human-readable surfaces.
  return {
    ...c,
    subjectLine: sanitize("subjectLine", c.subjectLine, "Where current voters actually split"),
    signal: { ...c.signal, takeaway: sanitize("signal.takeaway", c.signal.takeaway, "Among current voters, this one is far from decided.") },
    split: c.split
      ? { ...c.split, takeaway: sanitize("split.takeaway", c.split.takeaway, "Among current voters, this one is far from decided.") }
      : undefined,
    oneToWatch: c.oneToWatch
      ? { ...c.oneToWatch, takeaway: sanitize("oneToWatch.takeaway", c.oneToWatch.takeaway, "Still open. Your vote moves the line.") }
      : undefined,
  }
}

/**
 * Send the weekly newsletter.
 * @param opts.mode  "test" → single address; "all" → every opted-in subscriber
 * @param opts.testTo  required when mode==="test"
 * @param opts.from  optional sender override (e.g. for pre-verification preview)
 * @param opts.force  bypass the once-per-week idempotency guard (all mode)
 */
export async function sendNewsletter(opts: {
  mode: "test" | "all"
  testTo?: string
  from?: string
  now?: Date
  force?: boolean
}): Promise<SendOutcome> {
  const now = opts.now ?? new Date()
  const weekStarting = isoWeekStart(now)
  const from = opts.from ?? NEWSLETTER_FROM

  const content = lintContent(await selectNewsletterContent(now))
  const html = buildNewsletterHtml(content, { omitFooter: false }) // our footer + unsubscribe for Resend

  // ── TEST ────────────────────────────────────────────────
  if (opts.mode === "test") {
    const to = opts.testTo
    if (!to) throw new Error("testTo_required")
    const res = await sendEmail({
      label: "newsletter-test",
      to,
      from,
      subject: content.subjectLine,
      html,
      listUnsubscribeUrl: unsubUrl(to),
    })
    return {
      mode: "test",
      weekStarting,
      subjectLine: content.subjectLine,
      attempted: 1,
      sent: res.ok ? 1 : 0,
      failed: res.ok ? 0 : 1,
      sampleError: res.ok ? undefined : res.error,
    }
  }

  // ── ALL ─────────────────────────────────────────────────
  // Idempotency: don't double-send the same week unless forced.
  if (!opts.force) {
    const existing = await db
      .select()
      .from(newsletterDigestsTable)
      .where(eq(newsletterDigestsTable.weekStarting, weekStarting))
    if (existing.length > 0 && existing[0].status === "sent") {
      return {
        mode: "all",
        weekStarting,
        subjectLine: content.subjectLine,
        attempted: 0,
        sent: 0,
        failed: 0,
        skippedAlreadySent: true,
      }
    }
  }

  const subs = await db
    .select({ email: newsletterSubscribersTable.email })
    .from(newsletterSubscribersTable)
    .where(and(eq(newsletterSubscribersTable.newsletterOptIn, true), isNull(newsletterSubscribersTable.unsubscribedAt)))

  let sent = 0
  let failed = 0
  let sampleError: string | undefined
  for (let i = 0; i < subs.length; i++) {
    const email = subs[i].email
    const res = await sendEmail({
      label: "newsletter-weekly",
      to: email,
      from,
      subject: content.subjectLine,
      html,
      listUnsubscribeUrl: unsubUrl(email),
    })
    if (res.ok) sent++
    else {
      failed++
      sampleError = sampleError ?? res.error
    }
    // Gentle throttle to respect Resend rate limits.
    if ((i + 1) % 10 === 0) await new Promise((r) => setTimeout(r, 1100))
  }

  // Record the send (reuse existing columns; status "sent").
  await db
    .insert(newsletterDigestsTable)
    .values({
      weekStarting,
      subjectLine: content.subjectLine,
      introText: content.headline,
      htmlBody: html,
      status: "sent",
      pushedAt: new Date(),
      selectedPollIds: [],
      selectedPredictionIds: [],
    })
    .onConflictDoUpdate({
      target: newsletterDigestsTable.weekStarting,
      set: { subjectLine: content.subjectLine, htmlBody: html, status: "sent", pushedAt: new Date() },
    })

  return {
    mode: "all",
    weekStarting,
    subjectLine: content.subjectLine,
    attempted: subs.length,
    sent,
    failed,
    sampleError,
  }
}
