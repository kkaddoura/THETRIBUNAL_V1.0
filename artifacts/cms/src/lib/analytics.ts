/**
 * Minimal CMS-side analytics. Uses a *separate* PostHog project from the user
 * platform so admin actions (press-kit generation, content edits, digest pushes)
 * don't pollute the user-facing funnel data.
 *
 * Call init() once at app boot. track() no-ops until init succeeds.
 *
 * Consent: the CMS is an internal admin tool — capture is unconditional once
 * VITE_CMS_POSTHOG_KEY is set. If the CMS is ever exposed to external
 * editors, add a consent gate equivalent to the platform's IpConsentBanner.
 * Set VITE_CMS_ANALYTICS_DISABLED=true to short-circuit init in any
 * environment that needs zero capture.
 */

import posthog from "posthog-js"

let initialized = false

function getEnv(name: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[name]
}

export function init(): void {
  if (initialized) return
  if (getEnv("VITE_CMS_ANALYTICS_DISABLED") === "true") return
  const key = getEnv("VITE_CMS_POSTHOG_KEY")
  const host = getEnv("VITE_CMS_POSTHOG_HOST") ?? "https://us.i.posthog.com"
  if (!key) return

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    autocapture: false,
    persistence: "localStorage+cookie",
  })
  initialized = true
}

export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (!initialized) return
  try {
    posthog.capture(event, properties)
  } catch (err) {
    console.warn("[cms-analytics] capture failed", event, err)
  }
}

export function identify(adminUsername: string, traits: Record<string, unknown> = {}): void {
  if (!initialized) return
  const safe = { ...traits }
  delete (safe as Record<string, unknown>).email
  delete (safe as Record<string, unknown>).password
  delete (safe as Record<string, unknown>).pin
  delete (safe as Record<string, unknown>).token
  posthog.identify(`admin:${adminUsername}`, safe)
}

export function reset(): void {
  if (!initialized) return
  posthog.reset()
}
