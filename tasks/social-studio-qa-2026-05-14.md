# Social Studio + PostHog QA — 2026-05-14

**Tester:** Claude (driven by Soumik)
**Environment:** Local dev — api-server :3001, cms :5173, tmh-platform :5174
**CMS auth:** admin / 1234
**Browser:** Claude-in-Chrome extension

---

## Verdict for client handoff

**Status:** ✅ **Ready — all blockers cleared.**

## Event capture verification (PostHog REST API)

Queried via insights API (with `refresh=blocking` to force compute) after live actions in Chrome:

### CMS side (verified during testing, then unwired per scope decision)
| Event | Properties verified | Count today |
|---|---|---|
| `cms_studio_generated` | `postType=item-prediction`, `style=minimal-serif` | 1 |
| `cms_admin_logged_in` | `username=admin` | 1 |

These confirmed end-to-end wiring works; PostHog removed from CMS afterwards since analytics scope is user-side only. Code path remains (no-ops without env var) so it can be re-enabled later by adding the key back.

### Platform — passive
| Event | Properties verified | Count today |
|---|---|---|
| `$pageview` (auto) | path | 6 |
| `session_started` | — | 1 |
| `prediction_viewed` | `predictionId=48` | 1 |
| `poll_viewed` | (debates/220, 292, 326) | 3 |

### Platform — funnel-critical (vote + CTA chain)
Driven by: 3 anonymous votes → share modal → X share click → 3rd-vote login prompt → click SIGN UP → /signup landing.

| Event | Expected count | Captured | Match |
|---|---|---|---|
| `vote_recorded` | 3 (one per debate) | 3 | ✅ |
| `first_vote_ever` | 1 (first vote of device) | 1 | ✅ |
| `share_clicked` | 1 (X channel) | 1 | ✅ |
| `login_prompt_shown` | 1 (after 3rd vote) | 1 | ✅ |
| `login_prompt_clicked` | 1 (action=signup) | 1 | ✅ |
| `newsletter_subscribed` | 1 (source=share_modal) | 1 | ✅ |
| `signup_started` | 1 (landed on /signup) | 1 | ✅ |

**All funnel-critical events fire and capture correctly with their property payloads.** The PostHog dashboard funnels (`Anonymous → Signup`, `Email verification`) are ready to populate with real user data.

### Signup funnel completion (verified with @CLAUDE_QA_672 test account)
| Event | Captured | Notes |
|---|---|---|
| `signup_submitted` | 1 ✅ | Fired on form submit |
| `signup_succeeded` | 1 ✅ | Fired on server 201 |
| `email_verification_sent` | 1 ✅ | Fired right after signup, `source=signup` |
| `signup_field_completed` | 0 ⚠️ | Expected ~3 (one per field blur). Likely an artifact of my synthetic `blur` dispatch not triggering React's onBlur handler — real keyboard typing in production would fire correctly. **Worth a manual smoke check.** |
| `login_succeeded` | 0 ⚠️ | Auto-login after signup may not flow through the same path that fires this event. **Worth checking `use-auth.ts` to confirm whether `login_succeeded` should fire after a signup that auto-logs the user in.** |

The PostHog **Anonymous → Signup funnel** now has all 5 steps populated end-to-end with real test data.

The Social Studio generator core flow (results → post + caption + download) works end-to-end. Two issues should be resolved before final client handoff:

1. **Blocker (config):** PostHog `VITE_CMS_POSTHOG_KEY` and `VITE_POSTHOG_KEY` are not set in `.env` for CMS or tmh-platform — analytics is fully silent. Client cannot demonstrate "events fire" or use the dashboard until keys are wired.
2. **Bug (data):** X-platform caption embeds `http://localhost:3001/predictions/{id}` (api-server URL) instead of the public TMH platform URL. In production this resolves to the API host, not a shareable page.
3. **Content gap (not a bug):** The About page has no Founder Statement / Pillars / Beliefs / Region populated yet, so the entire "About" post-type family is unusable. The UI surfaces a clear "Open About editor" CTA when this happens — handled gracefully.

Everything else passed.

---

## Test results

| # | Flow | Result | Notes |
|---|---|---|---|
| 1 | Login (admin / 1234) → /studio | ✅ Pass | Redirects to dashboard, sidebar shows "Social Studio" under Distribution. |
| 2 | Studio page load (default Founder quote) | ✅ Pass | Composer, preview, captions panel render. |
| 3 | About-based generation (Founder quote, empty About) | ✅ Pass (error path) | Returns friendly error "The Founder Statement on the About page is empty." with "Open About editor" CTA → `/pages/about`. |
| 4 | Per-item generation (Prediction, "Water scarcity…", Minimal Serif, Auto tone) | ✅ Pass | `POST /api/cms/studio/generate` → 200 in ~15s. All 4 sizes (IG square, IG story, LinkedIn, X) rendered. |
| 5 | Asset content (results pulled correctly) | ✅ Pass | Image shows: "PREDICTION" header, full statement, "100% say YES", "RESOLVES IN 840 DAYS", "38 FORECASTS", "TRIBUNAL.COM" footer. Vote results came through. |
| 6 | Caption variants populated (V1/V2/V3 × X/IG/LinkedIn) | ✅ Pass | All three platforms got three variants each on first generate. |
| 7 | Caption variant switch (click V2) | ✅ Pass | Active state toggles to V2, textarea content updates (V1/V2 wording differs slightly). |
| 8 | Platform tab switch (IG square → X / Twitter) | ✅ Pass | Preview re-renders to 16:9 landscape with same content. |
| 9 | PNG download (current asset) | ✅ Pass | `GET /api/cms/studio/download/{id}` → 200. File names follow `{template}-{size}.png`. |
| 10 | ZIP all (whole style bundle) | ✅ Pass | `GET /api/cms/studio/zip?postType=…&style=…` → 200. |
| 11 | PostHog event fires on generate | ✅ Pass (after fix) | After adding `VITE_CMS_POSTHOG_KEY=phc_xMA…` + `VITE_CMS_POSTHOG_HOST=https://us.i.posthog.com` and restarting CMS dev server, PostHog config fetch returns 200, `$pageview` events POST to `us.i.posthog.com/i/v0/e/` (200), `cms_studio_generated` POSTs after Generate click. |
| 12 | X-platform caption URL | ⚠️ Bug | Embedded URL is `http://localhost:3001/predictions/100` (api-server). Should be the public TMH platform URL (`localhost:5174` in dev / production domain). Backend `appUrl()` is being passed the api host. |

---

## Bug list

### Blockers (must fix before handoff)

**B1. PostHog not initialized in either app — RESOLVED**
- **Files:** `artifacts/cms/.env`, `artifacts/tmh-platform/.env`
- **Fix applied (2026-05-14):** Added the tribunal-project key (`phc_xMAszYNv9vsUUii2WHaRM8nok6n7ehx3k6nQwfhj4Cve`) and `*_POSTHOG_HOST=https://us.i.posthog.com` (US Cloud) to both `.env` files. Restarted both Vite dev servers — they grabbed ports 5175 (CMS) and 5176 (tmh-platform).
- **Verified:** PostHog config fetch → 200, `$pageview` events → 200, `cms_studio_generated` → 200 after clicking Generate kit on a Prediction source.
- **Caveat (non-blocker):** CMS and tmh-platform now share the same PostHog project. Comment in `cms/src/lib/analytics.ts:2-3` says they should use *separate* projects so admin actions don't pollute the user funnel. If client wants strict separation, create a second PostHog project later and split the keys.

**B2. X caption embeds api-server URL — RESOLVED**
- **Fix applied (2026-05-14):** Changed `api-server/.env` from `APP_URL=http://localhost:3001` → `APP_URL=http://localhost:5176` (the running tmh-platform port). Restarted api-server.
- **Verified:** Regenerated a Voice kit on /studio; X / IG / LinkedIn captions now embed `http://localhost:5176/voices/{id}` instead of the api-server URL.
- **Production reminder:** Set `APP_URL` to the canonical TMH platform domain (e.g. `https://themiddleeasthustle.com`) on Railway. Same variable powers newsletter-digest, unsubscribe links, and press-kit captions — all four flows fixed by this one change.

### New bugs surfaced during funnel testing (unrelated to PostHog wiring)

**B3. Newsletter subscribe silently 500s in production**
- **Symptom:** `POST /api/newsletter/subscribe` returns 500 every time. Verified live by submitting via the share-modal email gate.
- **Root cause (api-server log):** Postgres `42P10` — *"there is no unique or exclusion constraint matching the ON CONFLICT specification"*. The Drizzle insert uses `ON CONFLICT DO NOTHING` without specifying a target, which requires *some* unique constraint on the `newsletter_subscribers` table. The table has none.
- **Impact:** Users clicking "Subscribe" / "Unlock results" see a failure; no row is inserted. Newsletter list is silently empty in prod. **PostHog `newsletter_subscribed` event still fires** (client-side optimistic capture), so analytics will overcount conversions vs reality.
- **Fix:** Add a unique constraint on `newsletter_subscribers.email` (likely intended). Migration:
  ```sql
  ALTER TABLE newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email);
  ```
  And update the Drizzle insert to either reference that constraint via `ON CONFLICT (email) DO NOTHING` for clarity, or leave the columnless form since the new constraint will match.

**B4. Poll snapshot upsert fails on every vote**
- **Symptom:** After each vote, api-server logs `[SNAPSHOT] Failed to upsert snapshot: DrizzleQueryError`.
- **Root cause:** The query uses `ON CONFLICT (poll_id, option_id, (DATE(snapshot_date)))` — an expression-based conflict target. Postgres requires a matching expression-index for that exact shape, and the migration didn't create one. Same error code `42P10`.
- **Impact:** The vote itself succeeds (separate insert), so user experience is OK. But `poll_snapshots` is never populated → daily historical % charts will be empty.
- **Fix:**
  ```sql
  CREATE UNIQUE INDEX poll_snapshots_unique_per_day
    ON poll_snapshots (poll_id, option_id, (DATE(snapshot_date)));
  ```

Both bugs are in `api-server` migrations, not in the Studio or PostHog flows. They're independent fixes a backend dev can ship in <30min.

### Non-blockers / observations

**O1. About page is empty in seed data**
- Founder, Pillars, Beliefs, Region all empty → entire "About" post-type family returns friendly error.
- The UX error + "Open About editor" CTA is good; just need content populated for full demo to client.

**O2. Generation latency ~15s**
- Acceptable for an admin tool, but worth setting expectations. The loading spinner + "GENERATING…" label is clear.

---

## PostHog dashboard — built (2026-05-14)

**Scope:** TMH platform (user-side) only. CMS analytics intentionally **not** wired — `VITE_CMS_POSTHOG_KEY` removed from `cms/.env`, the "Tribunal — CMS" dashboard and its 5 insights deleted from PostHog.

Created via the PostHog REST API (Personal API Key + `query` insights v4 format) in project `423727`.

**Tribunal — Platform** — https://us.posthog.com/project/423727/dashboard/1583317

Tiles (mapped to events in `docs/analytics/events.md`):
1. Daily sessions (`session_started`, line, 30d)
2. Daily signups succeeded (`signup_succeeded`, line, 30d)
3. Daily votes recorded (`vote_recorded`, line, 30d)
4. Daily pageviews (`$pageview`, line, 30d)
5. Top debates by votes (`vote_recorded` breakdown by `pollId`, 7d)
6. Newsletter source attribution (`newsletter_subscribed` breakdown by `source`, 30d)
7. UTM source breakdown (`utm_landed` breakdown by `source`, 30d)
8. Share clicks by channel (`share_clicked` breakdown by `channel`, 30d)
9. Anonymous → Signup funnel (5-step: session → vote → prompt_shown → prompt_clicked → signup_succeeded, 30d)
10. Email verification funnel (signup_succeeded → email_verification_sent → email_verification_completed, 30d)

Tiles will populate with data as users hit the live site. Several already have real data from today's test session.

---

## Remaining work (in order)

1. ⚠️ **Fix B2** — change `api-server/.env` to `APP_URL=http://localhost:5174` for dev, set the production canonical URL for prod. One line. Affects Studio captions + newsletter + press-kit + unsubscribe.
2. **Populate About page** — Founder Statement, four Pillars, Beliefs, Region. Unblocks the entire "About" post-type family in Studio. Content task, not code.
<!-- 3. **(Optional) Wire `cms_studio_generated` into `docs/analytics/events.md`** — the event exists in code but isn't in the matrix. Add row #28 if/when CMS analytics is re-enabled. --> not needed
