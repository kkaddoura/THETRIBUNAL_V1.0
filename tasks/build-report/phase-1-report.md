# Phase 1 — Launch Blockers

Shipped items that were blocking the pre-launch readiness. All 6 are in `main`.

---

## 1.1 Voices Status Filter Fix

**Commit:** `1a7f622`
**Files:**
- `artifacts/api-server/src/routes/profiles.ts` — added `eq(profilesTable.editorialStatus, "approved")` filter to all public queries
- `artifacts/tmh-platform/src/pages/__tests__/profiles.test.tsx` — new test suite (6 tests)
- `vitest.config.ts` — added React plugin for JSX transform
- `vitest.setup.ts` — restored (was untracked)
- `package.json` — added `@testing-library/dom` dependency

**Problem:** Voices sent to "archived" in CMS still displayed on the public website. Public profiles API was returning all profiles regardless of editorial status.

**Fix:** Added WHERE clause to:
- `GET /profiles` list endpoint
- `GET /profiles/:id` detail endpoint
- `similarProfiles` nested query inside detail
- Total count query

**Test coverage:** New `profiles.test.tsx` with 6 tests covering loading, loaded, empty states. Verifies the page only renders profiles returned by the API (since API is now filtering, only approved ones get through).

**Human verification:**
1. Open CMS, set a voice to "archived" status
2. Reload `/voices` on the website → voice should be gone
3. Try navigating directly to `/voices/:id` of the archived profile → should 404
4. Set it back to "approved" → voice reappears

---

## 1.2 Remove Vote Confirmation Flow

**Commit:** `ae6edf7`
**Files:**
- `artifacts/tmh-platform/src/components/poll/PollCard.tsx` — removed `if (isVoted) return` guard, added clickable result bars with change-vote handler
- `artifacts/tmh-platform/src/hooks/use-voter.ts` — allow `recordVote` to update optionId for already-voted polls
- `artifacts/api-server/src/routes/polls.ts` — vote endpoint now supports updates (decrement old option count, increment new option count, update vote record)

**Behavior change:**
- Click option → instant vote, no confirmation screen
- In results view, clicking a different option updates the vote instantly (optimistic UI + server update)
- Click same option = no-op
- First-time vote transitions to gate/results phase; vote changes stay in results phase
- Response includes `changed: boolean` flag

**Human verification:**
1. Vote on a debate → see instant results (no confirmation modal)
2. Click a different option in results view → percentages update immediately, user's red highlight moves
3. Refresh the page → vote persists (via localStorage)
4. Change vote again → old option count decrements, new option count increments

---

## 1.3 Telegram → Instagram

**Commit:** `aa190ea`
**Files:**
- `artifacts/tmh-platform/src/pages/faq.tsx` — 2 text references
- `artifacts/tmh-platform/src/pages/home.tsx` — 1 share button
- Server middleware `ogTags.ts` left alone (Telegram bot detection for crawlers is valid)

**Behavior:** No more Telegram share references in any user-facing text or buttons. Telegram bot crawler detection stays (it doesn't affect users).

**Human verification:**
1. Grep for `Telegram` anywhere in frontend — should find zero
2. Share dropdown on home page shows Instagram (pink dot) instead of Telegram (blue dot)
3. FAQ text lists "WhatsApp, X, LinkedIn, Instagram" as share options

---

## 1.4 CMS Ideation Category Dedup

**Commit:** `b9fef2e`
**Files:** `artifacts/cms/src/pages/ideation.tsx`

**Problem:** Category dropdown in the Ideation generator showed duplicates like "Education", "Education & Workforce" because it merged debate + prediction categories via `new Set()` which only dedups exact matches.

**Fix:** Categories are now derived per pillar:
- Focused mode (debates) → only debate categories
- Focused mode (predictions) → only prediction categories
- Explore mode → merged with case-insensitive dedup (strips `&` + whitespace when matching)

**Human verification:**
1. Open CMS → Ideation → Focused mode → select Debates → category dropdown should only show debate categories
2. Switch to Predictions → category dropdown should show prediction categories
3. Switch to Explore mode → should show a clean merged list without duplicates

---

## 1.5 Dummy Votes System

**Commit:** `47add20`
**Files:**
- `lib/db/src/schema/polls.ts` — added `dummyVoteCount` to `poll_options`
- `lib/db/src/schema/predictions.ts` — added `dummyTotalCount` + `dummyOptionResults` JSONB
- `lib/db/drizzle/0004_dummy_votes.sql` — migration SQL
- `artifacts/api-server/src/routes/polls.ts` — public API returns combined counts; `toPollResponse` now handles real + dummy totals
- `artifacts/api-server/src/routes/cms.ts` — stats endpoint returns vote counts separated (real vs dummy), new `/cms/boost` and `/cms/boost/categories` endpoints, `toPredictionPublicResponse` helper merges real + dummy for predictions
- `artifacts/cms/src/pages/dashboard.tsx` — Vote Counts card (real vs dummy), Boost Votes UI
- `artifacts/cms/src/lib/api.ts` — added `getBoostCategories`, `boostVotes` methods
- `scripts/src/seed-dummy-votes.ts` — seed script

**Schema:**
```sql
ALTER TABLE poll_options ADD COLUMN dummy_vote_count integer DEFAULT 0 NOT NULL;
ALTER TABLE predictions ADD COLUMN dummy_total_count integer DEFAULT 0 NOT NULL;
ALTER TABLE predictions ADD COLUMN dummy_option_results jsonb;
```

**Seed logic:**
- Each approved item gets 20-70 dummy votes
- Binary polls: 55-75% skew toward one side (randomized, never 50/50)
- Multi-option: leading option 35-45%, rest distributed naturally
- Predictions: same distribution logic applied to the options array

**Boost logic:**
- "Boost All" iterates all approved polls + predictions, adds 2-10% random increment to current total
- "Boost by Category" filters by category before iterating
- Each individual option gets boosted independently (prevents lopsided growth)

**Public API impact:**
- All public endpoints (`GET /polls`, `POST /polls/:id/vote`, `GET /predictions`, etc.) return **combined** (real + dummy) counts and percentages
- CMS endpoints return both values separately so the dashboard can show the breakdown

**Human verification (after running migration + seed):**
1. Run migration: `pnpm --filter @workspace/db run push`
2. Run seed: `pnpm -C scripts tsx src/seed-dummy-votes.ts`
3. Open public website → debates should show 20-70 votes each with realistic-looking distributions
4. Open CMS dashboard → Vote Counts card shows "Real" vs "Dummy" columns
5. Click "Boost All" → counts should increase by 2-10%
6. Click a specific category → only items in that category get boosted
7. Cast a real vote on the website → CMS dashboard's "Real" column should tick up by 1, "Dummy" stays the same

---

## 1.6 CMS Feature Toggles

**Commit:** `5a16dbc`
**Files:**
- `artifacts/cms/src/pages/page-site-settings.tsx` — added "Feature Toggles" tab with 4 toggles (Majlis, Share Gate, Email Capture, IP Consent)
- `artifacts/tmh-platform/src/hooks/use-cms-data.ts` — added `featureToggles` to `SiteSettings` interface
- `artifacts/tmh-platform/src/App.tsx` — conditionally renders Majlis routes (redirects to `/` when off)
- `artifacts/tmh-platform/src/components/layout/Navbar.tsx` — hides Majlis nav link when off
- `artifacts/tmh-platform/src/components/poll/PollCard.tsx` — hides Share to Majlis button, gates email unlock section behind `emailCapture` toggle
- `artifacts/tmh-platform/src/pages/home.tsx` — hides "Enter The Majlis" CTA
- `artifacts/tmh-platform/src/pages/profiles.tsx` — hides "Enter The Majlis" button
- `artifacts/tmh-platform/src/pages/__tests__/profiles.test.tsx` — updated mock to include `useSiteSettings`

**Config shape (stored in `cms_configs.value` JSONB under key `site_settings`):**
```json
{
  "featureToggles": {
    "majlis": { "enabled": false },
    "shareGate": { "enabled": true },
    "emailCapture": { "enabled": true },
    "ipConsent": { "enabled": false }
  }
}
```

**Default at launch:** Majlis OFF, Share Gate ON, Email Capture ON, IP Consent OFF. Admin can flip any of these without touching code.

**Human verification:**
1. CMS → Site Settings → Feature Toggles tab
2. Toggle Majlis OFF → save → reload website
   - No Majlis nav link, no footer link, no homepage button, no profile page button, no Share to Majlis on debates
   - Direct nav to `/majlis` or `/majlis/login` → redirects to home
3. Toggle Majlis ON → save → everything returns
4. Toggle Share Gate OFF → save → after voting on a debate, results show immediately (no gate modal)
5. Toggle Email Capture OFF → save → gate modal shows only social share options, no email input
6. IP Consent toggle already wired for Phase 2.1 work
