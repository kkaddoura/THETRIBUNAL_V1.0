/**
 * CMS-editable weekly newsletter schedule.
 *
 * Stored in the existing `cms_configs` key-value table under "newsletter_schedule"
 * (no migration). The cron heartbeat reads this each tick, so changes from the
 * CMS take effect immediately — no redeploy — and propagate across replicas.
 */

import { db, cmsConfigsTable } from "@workspace/db"
import { eq } from "drizzle-orm"

const CONFIG_KEY = "newsletter_schedule"

export interface NewsletterSchedule {
  enabled: boolean
  dayOfWeek: number // 0=Sun … 6=Sat (JS convention)
  hour: number // 0–23, in `timezone`
  minute: number // 0–59
  timezone: string // IANA, e.g. "Asia/Dubai"
}

export const DEFAULT_SCHEDULE: NewsletterSchedule = {
  enabled: false,
  dayOfWeek: 5, // Friday
  hour: 9,
  minute: 0,
  timezone: "Asia/Dubai",
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function validateSchedule(input: unknown): NewsletterSchedule {
  const s = (input ?? {}) as Partial<NewsletterSchedule>
  const dayOfWeek = Number(s.dayOfWeek)
  const hour = Number(s.hour)
  const minute = Number(s.minute)
  const timezone = typeof s.timezone === "string" && isValidTimezone(s.timezone) ? s.timezone : DEFAULT_SCHEDULE.timezone
  return {
    enabled: !!s.enabled,
    dayOfWeek: Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6 ? dayOfWeek : DEFAULT_SCHEDULE.dayOfWeek,
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_SCHEDULE.hour,
    minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : DEFAULT_SCHEDULE.minute,
    timezone,
  }
}

export async function getSchedule(): Promise<NewsletterSchedule> {
  const [row] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, CONFIG_KEY))
  if (!row) return { ...DEFAULT_SCHEDULE }
  return validateSchedule(row.value)
}

export async function setSchedule(input: unknown): Promise<NewsletterSchedule> {
  const schedule = validateSchedule(input)
  const [existing] = await db.select().from(cmsConfigsTable).where(eq(cmsConfigsTable.key, CONFIG_KEY))
  if (existing) {
    await db
      .update(cmsConfigsTable)
      .set({ value: schedule, updatedAt: new Date() })
      .where(eq(cmsConfigsTable.key, CONFIG_KEY))
  } else {
    await db.insert(cmsConfigsTable).values({ key: CONFIG_KEY, value: schedule })
  }
  return schedule
}

/** Current day/hour/minute in the schedule's timezone. */
function nowParts(now: Date, timezone: string): { dayOfWeek: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  let hour = Number(get("hour"))
  if (hour === 24) hour = 0 // some locales render midnight as "24"
  return { dayOfWeek: dayMap[get("weekday")] ?? -1, hour, minute: Number(get("minute")) }
}

/** True when `now` matches the configured day + hour + minute (and enabled). */
export function isDueNow(schedule: NewsletterSchedule, now: Date): boolean {
  if (!schedule.enabled) return false
  const p = nowParts(now, schedule.timezone)
  return p.dayOfWeek === schedule.dayOfWeek && p.hour === schedule.hour && p.minute === schedule.minute
}
