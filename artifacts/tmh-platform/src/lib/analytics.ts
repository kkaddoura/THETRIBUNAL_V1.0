/**
 * Single source of truth for client-side analytics.
 *
 * - PostHog handles events, funnels, retention, cohorts.
 * - Microsoft Clarity handles session replay + heatmaps.
 *
 * Both are initialized lazily on first `init()` call. PostHog is loaded with
 * `opt_out_capturing_by_default: true`; we explicitly opt the user in once we
 * know consent is granted (or once we know the site doesn't gate behind the
 * consent banner). Clarity is only injected when consent is granted.
 *
 * `track()`, `identify()` and `reset()` are safe to call before init — they
 * no-op silently. The `track()` calls that fire during the brief window
 * before init resolves are dropped on purpose; this is consistent with
 * PostHog's own buffering semantics.
 *
 * Email is never sent to PostHog. Only `userId` (which we control) gets sent
 * to identify().
 */

import posthog, { type PostHog } from "posthog-js"

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void
  }
}

interface InitOptions {
  consentGranted: boolean
  posthogKey?: string
  posthogHost?: string
  clarityProjectId?: string
}

let initialized = false
let consentApplied = false
let clarityLoaded = false

function getEnv(name: string): string | undefined {
  // Vite exposes env vars on `import.meta.env`. The build inlines them, so
  // missing values are simply `undefined`.
  return (import.meta.env as Record<string, string | undefined>)[name]
}

export function init(opts: Partial<InitOptions> = {}): void {
  if (initialized) {
    // Already initialized — just sync consent if it changed.
    setConsent(opts.consentGranted ?? false)
    return
  }

  const posthogKey = opts.posthogKey ?? getEnv("VITE_POSTHOG_KEY")
  const posthogHost = opts.posthogHost ?? getEnv("VITE_POSTHOG_HOST") ?? "https://us.i.posthog.com"
  const clarityProjectId = opts.clarityProjectId ?? getEnv("VITE_CLARITY_PROJECT_ID")

  if (!posthogKey) {
    // Analytics is optional in dev/staging without keys configured.
    return
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false, // we route this through usePageView()
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false, // we instrument explicit events only
    opt_out_capturing_by_default: true,
    loaded: (ph) => {
      // After load, sync consent state.
      if (opts.consentGranted) ph.opt_in_capturing()
    },
  })

  initialized = true
  setConsent(opts.consentGranted ?? false)

  // Clarity is consent-gated; we lazily inject it when consent is granted.
  if (opts.consentGranted && clarityProjectId) {
    loadClarity(clarityProjectId)
  }

  // Stash the project id for later loadClarity calls if consent flips on later.
  if (clarityProjectId) {
    ;(window as unknown as { __tmhClarityId?: string }).__tmhClarityId = clarityProjectId
  }
}

export function setConsent(granted: boolean): void {
  if (!initialized) {
    consentApplied = granted
    return
  }
  if (granted) {
    posthog.opt_in_capturing()
    const id = (window as unknown as { __tmhClarityId?: string }).__tmhClarityId
    if (id) loadClarity(id)
  } else {
    posthog.opt_out_capturing()
  }
  consentApplied = granted
}

export function track(event: string, properties: Record<string, unknown> = {}): void {
  if (!initialized || !consentApplied) return
  try {
    posthog.capture(event, properties)
  } catch (err) {
    console.warn("[analytics] capture failed", event, err)
  }
}

export function identify(userId: string, traits: Record<string, unknown> = {}): void {
  if (!initialized || !consentApplied) return
  // Strip any email/PII from traits — the wrapper is the choke-point.
  const safeTraits = { ...traits }
  delete (safeTraits as Record<string, unknown>).email
  delete (safeTraits as Record<string, unknown>).password
  posthog.identify(userId, safeTraits)
}

export function reset(): void {
  if (!initialized) return
  posthog.reset()
}

export function getPostHog(): PostHog | null {
  return initialized ? posthog : null
}

function loadClarity(projectId: string): void {
  if (clarityLoaded) return
  // Clarity bootstrap script — official snippet inlined to avoid extra fetch round trip.
  const c = window as unknown as { clarity?: unknown }
  c.clarity =
    c.clarity ||
    function (...args: unknown[]) {
      ;((c.clarity as { q?: unknown[] }).q = (c.clarity as { q?: unknown[] }).q || []).push(args)
    }
  const t = document.createElement("script")
  t.async = true
  t.src = `https://www.clarity.ms/tag/${projectId}`
  const s = document.getElementsByTagName("script")[0]
  s.parentNode?.insertBefore(t, s)
  clarityLoaded = true
}
