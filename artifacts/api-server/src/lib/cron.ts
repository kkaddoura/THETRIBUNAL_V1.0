/**
 * Scheduled jobs.
 *
 * Weekly newsletter: a per-minute heartbeat reads the CMS-editable schedule
 * (`newsletter_schedule` in cms_configs) and, when the current time matches the
 * configured day/hour/minute in the configured timezone, sends the issue to all
 * opted-in subscribers via Resend. Reading the schedule each tick means CMS
 * changes take effect with no redeploy and stay correct across replicas.
 *
 * Safety: a Postgres advisory lock guards each tick (one replica sends), and the
 * send itself is idempotent per ISO week. Beehiiv's HTML send API is
 * enterprise-only, so delivery is via Resend (see docs/newsletter-setup.md).
 *
 * Disabled by default — set DIGEST_CRON_ENABLED=true on prod only. The CMS
 * `enabled` toggle is the per-schedule on/off; this env gate registers the
 * heartbeat at all.
 */

import cron from "node-cron"
import { pool } from "@workspace/db"
import { sendNewsletter } from "../services/newsletter-send.js"
import { getSchedule, isDueNow } from "../services/newsletter-schedule.js"

const DIGEST_LOCK_KEY = 1985_03_04 // arbitrary stable bigint for the digest job

export function initCron(): void {
  if (process.env.DIGEST_CRON_ENABLED !== "true") {
    console.log("[cron] DIGEST_CRON_ENABLED != 'true' — skipping cron registration")
    return
  }

  // Per-minute heartbeat — the schedule itself lives in the CMS config.
  cron.schedule("* * * * *", () => {
    void heartbeatTick().catch((err) => {
      console.error("[cron/newsletter] unhandled error:", err)
    })
  })

  console.log("[cron] Registered: newsletter heartbeat (per-minute; schedule from CMS)")
}

async function heartbeatTick(): Promise<void> {
  const schedule = await getSchedule()
  if (!isDueNow(schedule, new Date())) return

  // Due now — acquire the lock so only one replica sends.
  const client = await pool.connect()
  try {
    const lockRes = await client.query("SELECT pg_try_advisory_lock($1) AS acquired", [DIGEST_LOCK_KEY])
    if (lockRes.rows?.[0]?.acquired !== true) {
      console.log("[cron/newsletter] Lock not acquired (another replica handled it) — skipping")
      return
    }
    console.log("[cron/newsletter] Schedule due — sending weekly newsletter…")
    const result = await sendNewsletter({ mode: "all", now: new Date() })
    console.log("[cron/newsletter] Done:", result)
  } catch (err) {
    console.error("[cron/newsletter] Job error:", err)
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [DIGEST_LOCK_KEY])
    } catch {
      // ignore
    }
    client.release()
  }
}
