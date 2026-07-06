# Social Studio — Simplification (2026-05-31)

Grilled & confirmed with user. Guiding principle: **don't complicate** — leave dead
code/columns (`nano-banana.ts`, `useAiImage`, `chosenCaptionIg/Li`) in place, no schema churn.

## Decisions
- All posters render at **1:1 square** only (drop x_landscape / ig_story / linkedin).
- **Prediction poster** = hand-drawn SVG trend chart (hero) + big `% SAY YES` verdict + question.
  Chart applies to **predictions only**. Thread `predictionsTable.trendData` through (synthetic fallback).
- Captions: **one neutral caption area, 3 distinct variants** (no per-platform tabs/limits). Fix empty bug.
- **Remove AI image generation** from the UI + compose entirely.
- Formats: drop **Story**; keep Single / Carousel·3 / Carousel·5 / Weekly recap, all 1:1.

## Tasks
### 1. Single 1:1 + drop Story + remove AI toggle (backend — studio.ts)
- [ ] `compose`: force `requestedSizes = ["ig_square"]`; remove story-only branch + AI image block.
### 2. UI (studio.tsx)
- [ ] Remove `story-only` from LAYOUTS; remove AI image toggle + `useAiImage` state.
- [ ] Remove size-switcher tabs in preview; always show the single square.
### 3. Prediction trend-chart poster
- [ ] Thread `trendData` (+ synthetic fallback) into prediction source.
- [ ] Rewrite `prediction-momentum.ts`: SVG area+line chart (data-URI `<img>`) + % verdict + question.
### 4. Captions: neutral single area + fix empty
- [ ] `captions.ts`: `generateNeutralCaptions()` → 3 distinct variants, distinct fallback.
- [ ] compose + getKit: store/expose neutral variants; studio.tsx shows one area + regenerate.
### 5. Verify
- [ ] Typecheck api-server + cms; run a prediction compose end-to-end.

## Review
**Done & verified (typecheck clean on api-server + cms; prediction poster rendered to PNG in all 3 styles).**
- `studio.ts` compose: `requestedSizes = ["ig_square"]`; `wantAiImage = false` (AI image disabled, code left in place).
- Prediction source threads `pred.trendData`; `prediction-momentum.ts` rewritten — SVG area+line chart (base64 data-URI `<img>`) as hero + dashed 50% ref + `NN% say YES/NO` verdict + resolve countdown. Synthetic-trend fallback mirrors the public API.
- `captions.ts`: `generateNeutralCaptions()` → 3 **distinct** non-empty variants (reuses the 3 per-platform fallback phrasings with one {{LINK}} substitution), so the pane is never blank even with no API key. compose + regen endpoint store `neutral` (mirrored into x/ig/linkedin; no migration — added optional `neutral?` to `CaptionVariants`).
- `studio.tsx`: dropped Story layout, removed AI toggle, removed size tabs (static "1:1 Square" label), rebuilt captions as one neutral area (3 variants, edit, copy, regenerate). Cleaned dead decls.
- Verified chart renders in minimal-serif / bold-crimson / magazine + synthetic-trend path.

---

# Account — Show user activity stats

User reported: after login, account page shows nothing about their interactions. Add a stats summary above the avatar selector.

## Plan

- [x] `auth.ts` — new `GET /api/auth/me/stats` endpoint. Joins via `userVoterTokensTable`, counts rows in `votes` and `prediction_votes` matching those tokens.
- [x] `use-auth.ts` — `useMyStats(enabled)` hook with 30s staleTime.
- [x] `account.tsx` — "Your activity" block above avatar selector: Debate votes count, Predictions count, plus Email + Newsletter status badges.
- [x] Typecheck `@workspace/api-server` + `@workspace/tmh-platform` — both clean.
- [x] Smoke test — `/api/auth/me/stats` returns 401 unauth as expected.

# Auth — Fix login/signup flow + email

Three bugs reported: (1) "too many login attempts" trips after 1 signup→logout→login cycle, (2) verification email never sends, (3) no welcome email on signup.

## Plan

- [x] `app.ts` — narrow rate limiter scope from blanket `/api/auth/*` to only `login`, `signup`, `forgot-password`, `reset-password`. /me, /avatars, /logout etc. were sharing the 10/15min bucket and exhausting it on normal page loads.
- [x] `auth.ts` — fix `from` address (`hello@tribunal.com` → `noreply@themiddleeasthustle.com`) so Resend doesn't reject on unverified domain.
- [x] `auth.ts` — fix `APP_URL` default (`https://tribunal.com` → `https://themiddleeasthustle.com`).
- [x] `auth.ts` — add `sendWelcomeEmail()`, call best-effort after signup (in addition to verification link).
- [x] `auth.ts` — extract `sendResendEmail()` helper that logs Resend non-OK responses so failures are visible (previously swallowed).
- [x] `.env` — populated empty `RESEND_API_KEY` with the user-provided key.
- [x] Typecheck `@workspace/api-server` — clean.
- [x] Smoke test — server boots; `/auth/me` returns 401 (no rate limit); `/auth/login` 401 on bad creds (still bucketed under the limiter).

## Review

Root cause of "too many login attempts": the limiter was mounted at `/api/auth` so every `useMe()` call (one per page load + on every `qc.invalidateQueries` after login/logout) was consuming the same 10/15min bucket as actual login attempts. A single signup → logout → login cycle with React Query refetches blew the budget. Fix: only rate-limit the credential-validating endpoints. /me, /avatars, /logout, /link-voter-token are now unlimited (still session-protected).

Root cause of email failure: two compounding issues — `RESEND_API_KEY` was empty in `.env`, and even if it had been set the `from` address (`hello@tribunal.com`) is on a domain Resend doesn't have verified for this account. The other working email senders (apply.ts, cms.ts) use `noreply@themiddleeasthustle.com` which is the correct verified domain. Auth was the outlier.

Welcome email is sent best-effort alongside the existing verification email (both fire-and-forget so signup never blocks on Resend).

## Verification needed by user

- Sign up with a real email and confirm both the welcome email and verification link arrive.
- Sign out, then sign back in repeatedly — should no longer hit the rate limit on normal use.
- If emails still don't arrive, check the api-server logs for `[auth] verification email failed (4xx):` — Resend will tell us exactly what's wrong (most likely: domain not verified or API key revoked).

# Filter Sidebar — Constant UI

Extract the Debates page sidebar pattern into a shared `FilterSidebar` component, then mount on Predictions and Pulse so all three pages have identical filter UI.

- [x] New `components/layout/FilterSidebar.tsx` — sticky-left shell with optional `search`, `sort`, and `categories` slots; encapsulates the "View More" expand state
- [x] `polls.tsx` — replaced ~125 lines of inline sidebar JSX with the component (passes search + sort tabs + categories)
- [x] `predictions.tsx` — removed header search + horizontal pill bar; wrapped content in `flex flex-col lg:flex-row gap-12`; mounted FilterSidebar with search + categories
- [x] `mena-pulse.tsx` — removed header search + inline `CategoryFilter` (function deleted); wrapped trends grid in flex layout; mounted FilterSidebar with search + categories
- [x] Typecheck `@workspace/tmh-platform` — clean
- [x] Tests — Chatbot test failures are pre-existing on `main` (verified via stash); not regressions

# Voices Feature Toggle

Mirror the existing Majlis toggle pattern for Voices. Default behavior: ON (preserve current state).

## Plan

- [x] Add `voices: { enabled: boolean }` to `FeatureToggles` interface in `artifacts/cms/src/pages/page-site-settings.tsx` (default `?? true`)
- [x] Add Voices toggle UI block in the Feature Toggles tab
- [x] Add `voices?: { enabled: boolean }` to `featureToggles` type in `artifacts/tmh-platform/src/hooks/use-cms-data.ts`
- [x] Gate `/voices` and `/voices/:id` routes in `App.tsx` (redirect to `/` when off)
- [x] Filter Voices link from `defaultLinks` and CMS-defined `cmsLinks` in `Navbar.tsx`
- [x] Conditionally render the `/* THE VOICES */` section in `home.tsx`
- [x] Filter Voices cell from the homepage stat-link grid in `home.tsx`
- [x] Filter `/voices` links in `Footer.tsx` (default NAV + CMS NAV; also added Majlis filter)
- [x] Hide `/voices` link in `join.tsx` desktop navbar
- [x] Hide `/voices` link in `not-found.tsx` explore section
- [x] Filter Voices pillar + "Meet The Voices" CTA in `about.tsx` (also added Majlis pillar filter)
- [x] Drop "voices" from Chatbot greeting topics when toggle is off
- [x] Typecheck `@workspace/tmh-platform` and `@workspace/cms` — both clean

## Review

Voices toggle now mirrors the Majlis pattern at every reference point. Default is `true` (preserves existing behavior).

When toggled OFF in CMS → Site Settings → Feature Toggles:
- `/voices` and `/voices/:id` redirect to `/`
- `/profiles` → `/profiles/:id` redirects also fall through to `/`
- Removed from: navbar, footer, homepage stat grid, homepage Voices section, `/about` pillars + CTA, `/join` desktop nav, `/404` explore links
- Chatbot greeting drops "voices" from its topic list
- CMS-defined nav/footer links starting with `/voices` are filtered out

Ancillary: `Footer.tsx` and `about.tsx` also got Majlis filtering for consistency (the CMS-defined Majlis pillar/footer link wasn't being filtered before — same toggle, same pattern).

The `/apply` route ("Join The Voices" CTA) was intentionally **not** gated — applications go to the CMS for editorial review and don't depend on the public Voices listing being visible.

## Notes

- Default `voicesEnabled` to `true` (preserves existing behavior on first deploy when `featureToggles.voices` is undefined)

# Hero Globe Panel — Live-Activity Overlay

Enhance the hero globe to match the live-activity dashboard aesthetic from the user's reference screenshot (rotating big city headline, two activity cards, live-user counter, "Global Hub" tag) **without** rebuilding the underlying cobe globe.

## Approach

- Keep `GlobeConnections.tsx` untouched (dark-mode globe already has the dotted/red look).
- New component `components/home/HeroGlobePanel.tsx` wraps `<GlobeConnections oscillate zoom={1.1} />` and adds overlays.
- Replace the bare `<GlobeConnections>` usage at `home.tsx:1621` with `<HeroGlobePanel />`.

## Plan

**Scope confirmed by user**: globe panel only (right column). Don't touch left column copy/CTAs or add bottom wire ticker.

Reference HTML: `tasks/e2e-testing/hero-globe.html` — used for: arc-spawning logic, ripples, leading-dot trail, activity card design, "Right Now" headline, "Live Activity Stream" status.

- [x] New `components/globe/HeroGlobe.tsx` — React port of the reference's globe + overlays + activity cards + arcs/ripples (no changes to existing `GlobeConnections.tsx`)
- [x] City list: 27 cities (10 MENA hubs + 17 global) with flag + country
- [x] 13 TMH-authentic activity templates ("voted on...", "predicted...", "joined the debate...", "submitted a Pulse story on...")
- [x] Cobe globe centered on MENA (PHI_CENTER=3.5), oscillates ±0.35 rad over ~17s, dark theme
- [x] Overlay canvas: dynamic arcs spawning every 1.6s (origin → MENA hub) with white-headed crimson trail, landing flash + expanding ripple ring at destination, MENA city labels
- [x] "RIGHT NOW [city]." headline top-left (rotates with each new activity)
- [x] "Live Activity Stream" status + pulsing red dot bottom-right
- [x] Bentham corner brackets (TL/TR/BL/BR)
- [x] Spawning activity cards (max 4 simultaneously) in 4 zones with crimson corner accents, flag + city/country, "Just now", and "Someone in X [verb] [highlighted-target]" message; auto-fade after 4.2s
- [x] `prefers-reduced-motion` respected
- [x] Typecheck clean (`pnpm typecheck` passed)
- [x] Wired into `home.tsx` (replaced `<GlobeConnections oscillate zoom={1.1} />` at line 1621 with `<HeroGlobe />`; removed unused `GlobeConnections` import)
- [x] Vite dev server serves the new module successfully (HTTP 200, HMR-compiled)

## Review

The TMH home hero now matches the reference screenshot's globe panel: a MENA-centered live-activity dashboard. Existing left-column copy/CTAs ("The Middle East, unfiltered.", subhead, "See Today's Debate" / "What is this?" CTAs) are unchanged.

**What changed visually:**
- The right-column globe is now framed with bentham corner brackets and a dark gradient backdrop
- A "RIGHT NOW [city]." display-font headline appears top-left, syncing with each spawned activity
- A "Live Activity Stream" status with pulsing red dot sits bottom-right
- Up to 4 floating activity cards appear at any time in the panel corners ("Someone in São Paulo just voted on...") and fade after 4.2s
- White-headed crimson arcs spawn every 1.6s from a random global city → MENA hub, ending in a landing flash and ripple ring on the destination MENA marker
- MENA cities show a red dot with crimson halo and uppercase label; non-MENA cities show small white dots
- The globe is oversized (122% of panel, shifted -11% right) and oscillates ±0.35 rad around the MENA meridian, so the region stays roughly centered

**Why this approach:**
- Did not touch `GlobeConnections.tsx` (zero risk to anything else even though it's now unused outside this page)
- Single new file in the same `components/globe/` folder so future cleanup is trivial
- Animation state lives in refs, not React state, so the canvas loop runs at full 60fps; only the "Right Now" city name and the cards array trigger React re-renders
- All custom keyframes scoped via `.hg-` prefix in inline `<style>` to avoid leaking into global CSS

**Limitations / follow-ups:**
- I couldn't open the page in a browser to eyeball it (Claude-in-Chrome extension not connected); typecheck and Vite compilation pass, but the user should verify positioning of cards on the actual panel size, and may want to tune `width: 122%` / `right: -11%` if the globe's MENA region drifts too far off-frame at their viewport
- Card zone positions assume the panel is at least ~480px wide; on the smallest mobile breakpoint (`max-w-[380px]`) cards may visually overlap the globe — if needed, hide cards under `sm:` or reduce to 2 zones

### Follow-up: light-mode theming (2026-05-09)

The first pass hardcoded the reference HTML's dark palette (black gradient, white text, dark cards), which clashed with TMH's default light hero (cream surface, dark text). Now theme-aware:

- [x] Added `isDarkRef` (ref, drives cobe render loop) + `isDark` state (drives React/CSS overlays), synced via `MutationObserver` on `<html>` `class`
- [x] Cobe globe params switch between dark and light variants (mirrors `GlobeConnections.tsx`'s pattern: `mapBrightness 2.2/8`, `baseColor [.35,.35,.4]/[1,1,1]`, `glowColor [.06,.04,.07]/[.96,.94,.91]`) — no globe recreation on theme flip, params updated each frame in `onRender`
- [x] Overlay canvas (arcs, leading dot, ripples, city dots/labels) branches on `isDarkRef.current` for: arc head color (white→cream), leading core (white→`#FFE9D8`), flash gradient stops, non-MENA dot fill (cream→dark), MENA label fill (cream→dark)
- [x] Inline `<style>` rewritten with `--hg-*` CSS variables under `[data-theme="light"]` and `[data-theme="dark"]` selectors. Light vars: cream gradient bg, dark eyebrow/strong/status text, white-cream card bg with dark text, dark bentham brackets, grain blends `multiply` instead of `overlay`
- [x] Crimson period (`.hg-tl-period`), live-status dot (`.hg-br-dot`), and verb spans (`.hg-verb`) stay `#DC143C` in both themes — they're brand accents, not theme-dependent
- [x] Typecheck clean, dev server confirms updated module includes both `[data-theme="dark"]` and `[data-theme="light"]` style blocks

### Follow-up: layout fix (2026-05-09)

Light-mode pass exposed two layout bugs that made the panel look broken:

**Bug 1 — Panel wasn't square at lg+.** The home hero's row uses `lg:items-stretch`, which sets an explicit height on each flex child to match the tallest one. Explicit `height` on an element overrides `aspect-ratio: 1/1`, so my `aspect-square` was being defeated at lg+ — the globe ended up centered vertically inside a tall cream rectangle with empty space above and below.
  - [x] Added `lg:self-center` to the `motion.div` wrapper around `<HeroGlobe />` in `home.tsx:1616`. This overrides `align-items: stretch` for just this child, so it sizes to its own (square) intrinsic dimensions instead of stretching to match the left column's tall height.

**Bug 2 — Activity cards collided with the city headline.** The previous random-zone placement let multiple cards land in zones 0/1 (top-left/top-right) at the same time, piling them up on top of the "RIGHT NOW [city]." headline.
  - [x] Replaced the 4-zone random scheme with a 2-slot deterministic system:
    - Slot `tr` (top-right) and slot `bl` (bottom-left) only — TL stays for the headline, BR stays for the live-status indicator
    - Each spawn alternates slots via a closure-scoped `nextSlot` toggle, guaranteeing one card per slot at most
    - When a new card targets a slot that still has an old card, the old card's TTL/fade timers are cancelled and it begins fading immediately, giving a clean handoff
  - [x] Tightened spawn cadence: `ARC_SPAWN_MS 1600 → 1800`, `CARD_TTL_MS 4200 → 3200`, `CARD_FADE_MS 600 → 500` — keeps the panel feeling alive without queue buildup
  - [x] Reduced card width: `clamp(180px, 48%, 240px) → clamp(168px, 44%, 220px)` so two cards never extend past the globe edges
  - [x] Removed obsolete `cardPosition(zone, yJitter)` helper, `MAX_CARDS` constant, and `yJitter`/`zone` fields on `ActivityCard`

Typecheck clean after both fixes.
- The Majlis toggle defaults `false`; Voices defaults `true` — different policies are intentional

# HeroGlobe — Mobile layout + perf pass

Mobile shows broken layout (cards overlap "Right Now" headline; long city names like "Johannesburg" overflow) and the cobe + overlay loop lags. Fix both in `components/globe/HeroGlobe.tsx`.

## Plan

- [x] `mapSamples` 18000 → 12000 on `(max-width: 640px)`
- [x] DPR capped at 1.25 on mobile (was 2)
- [x] `.hg-globe-wrap` on mobile: `width: 100%; right: 0` (drops 122% overscale → ~32% fewer pixels for cobe)
- [x] Activity spawner cadence on mobile: `1800ms → 2400ms`; arc cap `26 → 14`; pre-seed arcs `6 → 3` (less overlay work per frame)
- [x] TL "Right Now" headline on mobile: `clamp(20px, 7vw, 30px)` + `white-space: normal` + `right: 16px` so "Johannesburg" wraps inside the panel
- [x] Card width on mobile: `clamp(140px, 56%, 180px)`
- [x] Card positions on mobile: `tr → top: 38% / right: 4%`; `bl → bottom: 6% / left: 4%` (clears the now-taller TL headline + BR live badge)
- [x] Bentham brackets shrunk to 16px on mobile
- [x] Replaced inline `slotStyle` with CSS classes (`hg-card-tr` / `hg-card-bl`) so the breakpoint can override positions
- [x] Desktop visuals untouched (all changes scoped to `@media (max-width: 640px)` or `isMobile` branches)
- [x] `pnpm typecheck` clean
- [x] `pnpm build` clean

## Review

All edits live in `src/components/globe/HeroGlobe.tsx`:
- Two `useEffect`s now branch on `window.matchMedia("(max-width: 640px)").matches`: cobe init (dpr / mapSamples / seed arc count) and the activity spawner (cap + cadence).
- Inline `slotStyle` helper removed; card positioning lives entirely in CSS now so the media query can move cards independently.
- Added a single `@media (max-width: 640px)` block at the bottom of the component's `<style>` covering globe wrap, TL/BR overlays, brackets, and card geometry.
- No changes to `GlobeConnections.tsx`, `home.tsx`, or any data structures.

### Follow-up: on-globe pill labels broke during rotate on mobile

After the layout pass, the in-canvas city pills (CAIRO/DUBAI/RIYADH/…) overlapped each other on the small mobile panel because all 10 MENA hubs cluster into a much smaller area than on desktop (so same-size pills collided).

- [x] Split the dot+label loop into two passes; collect MENA label candidates with their projected `p.x/y/z`
- [x] Depth-sort candidates (front-most first) and render in that order
- [x] On mobile: cap to 4 pills max + skip any whose bbox overlaps an already-placed pill (`isMobile` from the parent closure)
- [x] On mobile: shrink pill geometry — font `8px → 7px`, padX `4 → 3`, pillH `11 → 9`
- [x] Desktop unchanged (no cap, no collision skip; previously all visible pills drew in CITIES order, now they draw in depth order — same visual outcome since they don't overlap on the larger panel)
- [x] `pnpm typecheck` clean

# Newsletter + Email — Finish-the-Job (no API keys required)

User asked to finish Beehiiv + Resend setup, build out remaining pieces, audit existing code. Most of the wiring already exists. The genuine gaps are dev-mode fallbacks and an unsubscribe flow.

## Audit findings

- Cron exists (`api-server/src/lib/cron.ts`): Friday 9am Asia/Dubai with Postgres advisory lock, gated on `DIGEST_CRON_ENABLED=true`.
- CMS admin pages: `/subscribers` (search/export/delete) + `/newsletter` (preview/push/history) already wired.
- Transactional FROM consistently `noreply@themiddleeasthustle.com` across `auth.ts`, `apply.ts`, `cms.ts`.
- Beehiiv sync wired from `newsletter.ts` (subscribe) and `polls.ts` (share-gate email unlock).
- `services/newsletter-digest.ts:26` defaults `APP_URL` to `"https://tribunal.com"` (wrong) + footer hardcoded `"tribunal.com"`. Should default to verified domain.
- Resend silently *skips* when key empty; Beehiiv silently *returns*. Hard to tell locally if signup actually worked.
- No unsubscribe endpoint, no signed-token flow, no `List-Unsubscribe` headers on transactional emails.
- Digest service uses Beehiiv's `POST /v2/publications/{pubId}/posts` with `content_html` — current spec marks this endpoint **Enterprise-beta** and the body field is `body_content`. Push may 404/422 on non-Enterprise plans. Out of scope for this pass — flagged for the founder to confirm plan tier before launch.

## Plan

### Phase A — Dev-mode fallbacks
- [ ] New `api-server/src/lib/email.ts`: shared `sendEmail({label, to, subject, html, text?, listUnsubscribe?})`. If `RESEND_API_KEY` empty, writes the rendered email to `uploads/dev-emails/{ts}-{label}-{to-slug}.html` and console logs path. If key present, hits Resend.
- [ ] `auth.ts` — swap inline `sendResendEmail()` to use the shared helper.
- [ ] `apply.ts` + `cms.ts` — swap inline `fetch("https://api.resend.com/emails", …)` calls to use the helper.
- [ ] `newsletter.ts syncToBeehiiv()`: when no `BEEHIIV_API_KEY`, log `[BEEHIIV-DEV] would sync {email}`.

### Phase B — Unsubscribe flow
- [ ] Migration `0008_newsletter_unsubscribed_at.sql`: add `unsubscribed_at timestamp NULL` to `newsletter_subscribers`.
- [ ] Schema update in `lib/db/src/schema/polls.ts:51`.
- [ ] New env var `UNSUBSCRIBE_SECRET` (HMAC signing key, 32 random bytes).
- [ ] New `api-server/src/lib/unsubscribe.ts`: `signUnsubscribeToken(email)` / `verifyUnsubscribeToken(token)` via HMAC-SHA256 + base64url.
- [ ] `newsletter.ts` new routes:
  - `GET /newsletter/unsubscribe?token=…` — confirmation page HTML.
  - `POST /newsletter/unsubscribe?token=…` — flips opt_in → false, sets `unsubscribed_at = now()`, calls Beehiiv `PATCH /publications/{pub}/subscriptions/{sub}` with `{unsubscribe: true}` (best-effort). RFC 8058 one-click compliant.
- [ ] `newsletter.ts` new helper `unsubscribeFromBeehiiv(email)` — list subscriptions by email, PATCH match.
- [ ] `auth.ts` (verify/welcome) + `apply.ts` (application status) emails: add `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers using signed token.
- [ ] Digest HTML: replace broken `{{rss_feed}}` at `newsletter-digest.ts:316` with Beehiiv's `{{unsubscribe_link}}`.

### Phase C — Polish
- [ ] Fix `services/newsletter-digest.ts:26` default `APP_URL` to `https://themiddleeasthustle.com`.
- [ ] Fix hardcoded `"tribunal.com"` in digest footer at line 315 — derive from `APP_URL`.
- [ ] Add `UNSUBSCRIBE_SECRET` + `DIGEST_CRON_ENABLED` to `.env.production.example`.
- [ ] Add `UNSUBSCRIBE_SECRET` placeholder to `artifacts/api-server/.env`.

### Phase D — Verification
- [x] `pnpm typecheck` for `@workspace/api-server`, `@workspace/tmh-platform`, `@workspace/cms` — all clean (after rebuilding `lib/db` .d.ts).
- [x] Unit test: HMAC token round-trips valid emails; rejects tampered/empty/malformed; email is lowercased.
- [x] Dev-mode email fallback writes to `uploads/dev-emails/{ts}-{label}-{to}.html` with full metadata header + body when `RESEND_API_KEY` is missing.

## Review

### What changed

**New files**
- `lib/db/drizzle/0008_newsletter_unsubscribed_at.sql` — adds `unsubscribed_at` timestamp column.
- `artifacts/api-server/src/lib/email.ts` — single `sendEmail()` helper. Writes to `uploads/dev-emails/` when no Resend key (so signup flows are visibly testable locally). Supports `listUnsubscribeUrl` for RFC 8058 one-click.
- `artifacts/api-server/src/lib/unsubscribe.ts` — HMAC-SHA256 signed tokens (`base64url(email).base64url(sig)`). Stateless — no DB write per token. `UNSUBSCRIBE_SECRET` env required in prod, falls back to a fixed dev value otherwise.

**Modified**
- `lib/db/src/schema/polls.ts` — added `unsubscribedAt: timestamp` column to `newsletter_subscribers`.
- `artifacts/api-server/src/routes/newsletter.ts` — full rewrite:
  - `syncToBeehiiv()` logs `[BEEHIIV-DEV] would sync …` when key missing (was silent return).
  - New `unsubscribeFromBeehiiv()` helper: GETs subscription by email, PATCHes `{unsubscribe: true}`.
  - New `GET /newsletter/unsubscribe` route — branded confirmation HTML page.
  - New `POST /newsletter/unsubscribe` route — RFC 8058 one-click endpoint.
  - Both flip `newsletter_opt_in=false` + set `unsubscribed_at = now()`, then mirror to Beehiiv best-effort.
- `artifacts/api-server/src/routes/auth.ts` — removed inline `sendResendEmail()` helper. Verification and welcome emails now use `sendEmail()` with `listUnsubscribeUrl`. Password-reset doesn't get a List-Unsubscribe header (it's 1:1 security, not bulk).
- `artifacts/api-server/src/routes/apply.ts` — application-status emails now use `sendEmail()`. No more empty-key silent skip.
- `artifacts/api-server/src/routes/cms.ts` — Majlis invite email uses `sendEmail()`.
- `artifacts/api-server/src/services/newsletter-digest.ts` — `APP_URL` defaults to `https://themiddleeasthustle.com` (was `tribunal.com`). Footer derives hostname from `APP_URL`. Broken `{{rss_feed}}` template var replaced with Beehiiv's `{{unsubscribe_link}}` (which Beehiiv interpolates at send time).
- `artifacts/api-server/.env` + `.env.local` — added `UNSUBSCRIBE_SECRET`, `DIGEST_CRON_ENABLED=false`, `APP_URL`. Documented dev-mode fallback behavior.
- `.env.production.example` — same docs + REQUIRED warnings for prod.

### Manual steps before launch

1. **Apply migration on prod DB** — `pnpm --filter @workspace/db push` (drizzle-kit push) or run `0008_newsletter_unsubscribed_at.sql` manually. Without it, `POST /newsletter/unsubscribe` will throw on the `unsubscribed_at` write.
2. **Set `UNSUBSCRIBE_SECRET`** on Railway (32+ char hex). The app throws on boot in prod if it's missing or under 16 chars.
3. **Set `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID`** when admin access is sorted out (currently blocked — see "manual step 2" in conversation).
4. **Verify Resend sending domain DNS** — DNS records captured during dashboard setup; client to add at registrar.
5. **Confirm Beehiiv plan tier** — `POST /v2/publications/{pubId}/posts` (used by the weekly digest pipeline) is marked enterprise-beta in the current Beehiiv API spec. If push fails with 403/404, fall back to Beehiiv's Automations or generate the email via Resend Broadcasts instead.
6. **Enable cron in prod** — `DIGEST_CRON_ENABLED=true` on a **single** Railway replica. The advisory-lock guard means it's safe if you forget and set it on more than one, but cleanest to gate to one.

### Known limitations

- Unsubscribe operates on `newsletter_subscribers` table only. If the same email is also in `users.newsletter_opt_in=true`, that flag stays true. Acceptable — `newsletter_subscribers` is the canonical send list. If we ever query `users` for sending, revisit.
- HMAC token has no expiry. Stolen email + secret → forever unsubscribe link. Acceptable threat model for a newsletter; rotate `UNSUBSCRIBE_SECRET` if compromised (will invalidate every outstanding link in the wild).
- The digest pipeline still uses `content_html` as the body field, which the current Beehiiv spec calls `body_content`. Flagged but not changed — code may need adjustment once the founder confirms plan tier and we can hit the live endpoint.
