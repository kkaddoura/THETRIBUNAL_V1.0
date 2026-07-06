# CMS Analytics — Audit & Gap List

Audit of `artifacts/cms/src/lib/analytics.ts` and its call sites in the CMS app, conducted 2026-05-08.

**Verdict:** the CMS analytics module works for the two events it currently fires, but it has several architectural gaps that will produce misleading data once the CMS is used by more than one admin or once the event matrix grows.

---

## 1. What's wired (working)

- ✅ Separate PostHog project (`VITE_CMS_POSTHOG_KEY` + `VITE_CMS_POSTHOG_HOST`) keeps admin actions out of the user funnel
- ✅ `init()` is called once at app boot from `App.tsx`
- ✅ `track()` no-ops cleanly when key is unset
- ✅ Two events fire today: `cms_press_kit_generated`, `cms_digest_pushed`
- ✅ `capture_pageview: true` — auto-pageviews work without per-route hooks (acceptable since CMS doesn't need the funnel discipline of the public site)

---

## 2. What's broken or missing

### 2.1 No admin identification

**Problem:** `identify(adminUsername)` is exported from the module, but **nothing in the CMS calls it**. Every CMS event fires under a fresh anonymous distinct ID, with no way to attribute the action to a specific admin.

**Impact:** You cannot answer "who generated that press kit?" or "which admin pushed last week's digest?" from PostHog. C3 ("Active admins") in `dashboard-setup.md` will show **incorrect uniques** because each browser session counts as a different user.

**Fix:** call `identify(user.username)` from the CMS auth provider after a successful login. Likely location: wherever the CMS reads the current admin (search for the existing `useMe`-equivalent hook on the CMS side, or whoever sets the `Authorization: Bearer` header for `/api/cms/auth`).

### 2.2 No reset on logout

**Problem:** `lib/analytics.ts` exports no `reset()` function. When admin A logs out and admin B logs in on the same browser, all of admin B's events stay attributed to admin A's PostHog distinct ID until the cookie naturally expires.

**Impact:** Cross-admin attribution is broken on shared workstations.

**Fix:** add to `cms/src/lib/analytics.ts`:

```ts
export function reset(): void {
  if (!initialized) return
  posthog.reset()
}
```

Then call it from the CMS logout handler (mirror the platform's `useLogout` pattern).

### 2.3 No consent gating

**Problem:** Platform `lib/analytics.ts` is opt-out by default and respects the IP-consent banner. CMS `lib/analytics.ts` captures unconditionally — `opt_out_capturing_by_default` is not set.

**Impact:** Acceptable for an internal admin tool (admins implicitly consent by being employees), but document this explicitly so a future privacy review doesn't flag it. If the CMS is ever exposed to external editors or contributors, this becomes a liability.

**Recommended action:** add a comment in `cms/src/lib/analytics.ts` documenting the intentional difference, or add a kill-switch env var (`VITE_CMS_ANALYTICS_DISABLED=true`) for environments where capture should be off.

### 2.4 No PII strip in `identify`

**Problem:** Unlike the platform module, the CMS `identify()` does not strip `email`/`password`/etc. from traits. Today this doesn't matter because `identify` is called with no traits. But it's a defense-in-depth hole — if someone later adds `identify(username, { email })`, PII will leak.

**Fix:** mirror the platform's strip pattern:

```ts
export function identify(adminUsername: string, traits: Record<string, unknown> = {}): void {
  if (!initialized) return
  const safe = { ...traits }
  delete (safe as Record<string, unknown>).email
  delete (safe as Record<string, unknown>).password
  posthog.identify(`admin:${adminUsername}`, safe)
}
```

### 2.5 Sparse event coverage

**Problem:** Only 2 CMS events exist. The CMS does much more than press-kit and digest:

| Action | Currently tracked? |
|---|---|
| Admin login | ❌ |
| Admin logout | ❌ |
| Content created (poll/prediction/voice) | ❌ |
| Content edited | ❌ |
| Content published / unpublished | ❌ |
| Content deleted | ❌ |
| Manual prediction resolution | ❌ (also needs server-side via posthog-node — see Phase 2 in `events.md`) |
| Three-tests-modal opened / submitted | ❌ |
| Majlis invite created / revoked | ❌ |
| Majlis email sent (existing commit `416ebd1` mentions duplicate-invite prevention — uninstrumented) |  ❌ |
| CMS feature toggle changed | ❌ |
| Site settings updated | ❌ |
| Ideation engine generated content | ❌ |
| Press kit downloaded (vs generated) | ❌ |
| Digest preview opened (vs pushed) | ❌ |

**Recommended minimum CMS event set** (Phase 2):

- `cms_admin_logged_in`
- `cms_admin_logged_out`
- `cms_content_created` (`{ contentType, contentId }`)
- `cms_content_published` (`{ contentType, contentId, scheduled: boolean }`)
- `cms_prediction_resolved` (`{ predictionId, verdict, manual: boolean }`)
- `cms_majlis_invite_sent` (`{ inviteCount }`)
- `cms_settings_changed` (`{ section: "site" \| "feature_toggles" \| "navigation" \| ... }`)

Avoid PII in any of these (no admin email in props — admin is identified via distinct ID).

### 2.6 Property naming inconsistency

The platform uses `camelCase` for property keys (`pollId`, `optionId`). The CMS events do too (`contentType`, `contentId`). This is fine and consistent. Just keep it consistent for any new events — PostHog is case-sensitive, and `contentId` ≠ `contentid` ≠ `content_id` for breakdowns.

### 2.7 No autocapture is fine, but no toolbar access either

`autocapture: false` in CMS analytics means the PostHog Toolbar (heatmaps, click recording) won't work in the CMS either. This is almost certainly desired — admins don't need heatmap analysis on internal tools. Just confirm this is intentional.

---

## 3. Comparison: platform vs CMS

| Capability | Platform | CMS |
|---|---|---|
| `init()` once at boot | ✅ | ✅ |
| Consent gating | ✅ (opt-out default + banner) | ❌ (always on) |
| `identify()` after login | ✅ (`useMe()` calls `identify("user:{id}", { username })`) | ❌ (function exists, never called) |
| `reset()` after logout | ✅ (`useLogout` calls `resetAnalytics()`) | ❌ (function doesn't exist) |
| PII strip in `identify` | ✅ (drops `email`, `password`) | ❌ (no strip) |
| Manual `$pageview` | ✅ (via `usePageView()`) | n/a (auto-pageview enabled) |
| Autocapture | ❌ (intentional) | ❌ (intentional) |
| Cross-tab consent sync | ✅ (storage event listener) | n/a (no consent gate) |
| Project key | `VITE_POSTHOG_KEY` | `VITE_CMS_POSTHOG_KEY` |

---

## 4. Action items (in priority order)

1. **Wire `identify()` from CMS auth state** — without this, admin attribution is broken. Single highest-value fix.
2. **Add and wire `reset()` for CMS logout** — needed before multi-admin shared workstations are realistic.
3. **Add minimum Phase 2 CMS events** — at least `cms_admin_logged_in`, `cms_content_published`, `cms_prediction_resolved` (server-side).
4. **Add PII strip to CMS `identify()`** — defense-in-depth.
5. **Document the no-consent decision** explicitly in `cms/src/lib/analytics.ts` header comment.
6. **Consider posthog-node** for server-side CMS actions (resolution finalize, scheduled publish) so events fire even when the action is async/cron-driven.

None of these are urgent — the existing 2 events work. But all 6 should be done before the CMS dashboard from `dashboard-setup.md` § 7 can be trusted for decision-making.

---

## 5. Status of action items (as of 2026-05-08)

- ✅ **#1 — `identify()` wired.** Called on CMS login success and on session restore (token verify). See `cms/lib/auth.tsx`.
- ✅ **#2 — `reset()` added and wired.** Exported from `cms/lib/analytics.ts` and called on logout in `cms/lib/auth.tsx`.
- ⏳ **#3 — Minimum CMS events.** `cms_admin_logged_in` and `cms_admin_logged_out` are now firing (events #26 and #27 in `events.md`). `cms_content_published` and `cms_prediction_resolved` remain Phase 2 (require server-side `posthog-node` for the resolution one).
- ✅ **#4 — PII strip.** `identify()` now strips `email`, `password`, `pin`, and `token` from traits before forwarding.
- ✅ **#5 — No-consent decision documented.** Header comment in `cms/lib/analytics.ts` notes the intentional behaviour and adds `VITE_CMS_ANALYTICS_DISABLED` kill-switch env var.
- ⏳ **#6 — `posthog-node`.** Not installed. Needed for server-side events (`prediction_resolved`, `streak_broken`, email webhook events). Add when first Phase 2 server-side event is wired.

**Remaining client-handover-blocking items: none.** The CMS analytics module now has parity with the platform module on identification, reset, PII handling, and basic auth events. Phase 2 events can ship incrementally per the tranches in `events.md` § Phase 2.
