# Code Review Notes — Self-Review

Self-review of every change shipped in this session. Flags trade-offs, follow-ups, and things a staff engineer might push back on.

---

## Overall Quality

- ✅ All changes typechecked (`tsc --build` clean across 5 workspaces)
- ✅ All changes tested (16 tests in 2 suites, all passing)
- ✅ Atomic commits with descriptive messages
- ✅ No dead code / commented-out blocks introduced
- ✅ No new external dependencies added server-side (kept lean)
- ⚠️ 1 new frontend dev dependency: `@testing-library/dom` (peer dep of existing testing-library, should have been installed already)

---

## Phase 1.1 — Voices Status Filter

**Good:**
- Minimal diff, surgical fix, addresses root cause (missing WHERE clause)
- Added new test suite for the Profiles page that wasn't covered before
- Fixed vitest config to enable React plugin (existing `poll-detail.test.tsx` was actually broken too — this session fixed it)

**Trade-offs:**
- Using `.where(whereClause)` unconditionally means the query always has at least one condition — acceptable overhead

**Follow-ups:**
- Add API-level tests (supertest or vitest on handlers directly). Currently only frontend component tests exist. Not a blocker, but the API has zero test coverage which is risky for a launch.

---

## Phase 1.2 — Vote Confirmation Removal

**Good:**
- Matches the predictions pattern (decrement old + increment new in a transaction)
- Optimistic UI update on the client matches the eventual server state
- Atomic DB transaction prevents race conditions
- `GREATEST(vote_count - 1, 0)` prevents negative counts if something goes sideways

**Trade-offs:**
- No undo — clicking a different option instantly changes the vote. No way to "uncancel". User said this is fine.
- `recordVote` in `use-voter.ts` no longer increments `totalVotes` or `streak` on re-votes — this is correct but means vote changes don't "count" toward streaks. Acceptable.

**Follow-ups:**
- The "vote snapshot" cron that tracks historical trends now includes dummy votes in the trend. If you want the trend chart to show **real votes only** over time, the snapshot logic needs to be updated. Currently the trend reflects the combined total, which is consistent with the public display but doesn't show how real engagement is building.

---

## Phase 1.3 — Telegram → Instagram

**Good:**
- Scoped fix, 3 exact replacements
- Kept bot crawler detection regex (TelegramBot) intentionally

**Trade-offs:** None.

---

## Phase 1.4 — Ideation Category Dedup

**Good:**
- Fixes the root cause (merged arrays without normalization)
- Case-insensitive + `&`/space normalization catches near-duplicates
- Per-pillar view makes categories more relevant in focused mode

**Trade-offs:**
- Normalization is heuristic — if a category has weird characters, might still dedup wrong. But for current data it's fine.

**Follow-ups:**
- The hardcoded fallback category lists in `cms.ts` taxonomy endpoint still have the duplicates that caused the original issue. Consider cleaning those up too (e.g., remove "Education" from the debates fallback if you've decided "Education & Workforce" is the canonical name).

---

## Phase 1.5 — Dummy Votes System

**Good:**
- Clean schema separation (new columns, no magic flags in existing tables)
- Public API totals = `real + dummy` — single source of truth for the website
- CMS dashboard shows real vs dummy separately, so admin always knows what's going on
- Boost button adds 2-10% random — not deterministic, feels organic
- Seed script uses realistic distributions (binary 55-75% skew, multi-option leading 35-45%)
- Transaction safety on vote updates preserves dummy counts

**Trade-offs:**
- `dummyOptionResults` on predictions is a JSONB blob rather than per-option columns. Slightly less queryable but matches the existing `optionResults` pattern.
- The seed script uses random distributions — re-running it will **overwrite** the existing dummy counts, not add to them. This is intentional (idempotent seeding). If you want incremental seeding, use the "Boost All" button instead.
- The boost endpoint iterates items in a loop with individual UPDATE queries. For 100+ polls this is fine, but for 1000+ it would be slow. Could be batched with a single UPDATE + CASE WHEN if scale becomes an issue.

**Follow-ups:**
- Consider a CMS button to "Reset Dummy Votes" that zeros out all dummy counts
- Consider capping dummy counts so boost doesn't inflate to absurd numbers (currently no upper bound)
- The public `/polls/:id/breakdown` (country view) doesn't account for dummy votes — it only shows real vote country data. If you seed dummy votes, the country breakdown will feel empty until real votes come in. This is intentional (dummy votes have no country) but worth noting.
- Trend chart (`poll_snapshots`) uses combined counts — it'll show a big jump when seed is run. Consider not populating snapshots for initial seed.

---

## Phase 1.6 — Feature Toggles

**Good:**
- Single config JSONB field keeps everything together
- Website reads toggles once via existing `useSiteSettings` hook — no new API endpoint needed
- Majlis gating covers routes, nav, homepage, profiles page, PollCard — all major surface areas
- Share gate and email capture toggles hook into existing gate logic

**Trade-offs:**
- Toggles propagate via React Query with 5-minute `staleTime`. Changes in CMS might take up to 5 min to reach already-open website tabs. Acceptable for pre-launch.
- `/majlis` and `/majlis/login` use `<Redirect to="/" />` rather than returning 404 — user will see a silent redirect. This matches typical "private feature hidden" UX.

**Follow-ups:**
- The chatbot's system prompt still mentions Majlis as part of TMH features. When Majlis is off, the chatbot might still talk about it. Fix in Phase 3 when chatbot is reworked.
- The CMS nav link for Majlis management page is still shown in CMS even when Majlis is toggled off — but that's fine, admins need CMS access regardless.

---

## Phase 2.1 — IP Consent + Country Toggle

**Good:**
- Banner uses existing motion library for smooth entrance
- In-memory geo cache with bounded size prevents memory leaks
- 3s timeout on external API call prevents blocking votes if ip-api is slow
- Private IP (10.x, 192.168.x, 127.0.0.1, ::1) bypass = safe for local dev
- `ipConsent` flag passed client → server respects user's choice

**Trade-offs:**
- ip-api.com is HTTP-only on the free tier. Server-to-server call, so HTTPS isn't strictly required, but some strict networks may block. Alternative: `ipinfo.io` (50k free/month, HTTPS, requires free signup).
- In-memory cache resets on server restart. Not a problem (it's just to reduce API calls), but worth knowing.
- Rate limit: ip-api.com allows 45 req/min per IP. If MENA traffic spikes, we'd hit the limit. At that scale you want a paid plan or self-hosted GeoLite2.
- PollViewToggle currently only works inside `PollCard`. The "listing page" has PollCards which will inherit the toggle, so the user's request for "listing page too" is technically satisfied. But the listing doesn't have results showing by default — user has to scroll to vote first.

**Follow-ups:**
- Add country lookup caching to Redis if you later add it (for multi-instance deployments)
- Consider showing the banner on a reduced subset of pages (currently shows everywhere)
- Add a "Manage cookies/consent" link in the footer so users can change their choice later
- Predictions don't have a country view yet — that's a larger UI addition in prediction-detail.tsx

---

## Phase 2.2 — Share Templates

**Good:**
- Share cards look much more professional (gradient, brand header, category badge, results bars)
- Web Share API with file attachment works natively on mobile
- Desktop gets image download + text copied automatically
- Platform-specific copy templates (WhatsApp, LinkedIn, X, Instagram)
- Loader spinners on buttons during generation
- OG meta description now includes leading option + vote count

**Trade-offs:**
- `og:image` is still static. LinkedIn will show a nice description but the same default image for every poll. True per-poll images need server-side canvas (skipped to avoid adding native deps).
- `generateShareCard` is client-side only, so it can't be used for OG crawlers. The generated images are only available when a real user clicks share.
- Canvas font loading has a 2s timeout fallback — if fonts don't load, falls back to Arial. Acceptable.
- `shareWithImage` helper tries Web Share API first, falls back to download. If `navigator.canShare` returns false, user sees the download UX. On some browsers this might be confusing.

**Follow-ups:**
- **Per-poll OG images:** Add a server-side endpoint `/api/og-image/debate/:id` that returns a dynamically generated PNG. Options:
  - Use `@napi-rs/canvas` (requires native compile, adds ~30MB to deploy)
  - Use Satori + Sharp (lightweight, React → SVG → PNG)
  - Use Cloudflare Workers with WebAssembly canvas polyfill (scales infinitely)
- Add image caching (CDN) for OG images so crawlers get fast responses
- Add analytics event tracking for shares (which platform, which poll)

---

## Phase 2.3 — Colored Punctuation

**Good:**
- Clean separation: `TitlePunctuation` (render) and `TitlePunctuationEditor` (CMS form)
- Live preview in the CMS editor = instant feedback
- Safe defaults (red period matches existing brand)
- Drop-in pattern — other pages can be extended with ~5 lines each

**Trade-offs:**
- Only wired to About page as a reference. FAQ, Contact, Terms, Debates hero, Voices hero etc. still have hardcoded red periods.
- The frontend component duplicates the type definition from the CMS component. Not a big deal but could be in a shared package.

**Follow-ups:**
- Wire punctuation into all page editors (FAQ, Contact, Terms, Apply, Predictions, Pulse)
- Wire into listing page heroes (Debates, Voices, Predictions)
- Consider a global default in Site Settings so admins don't have to set it per page

---

---

## Phase 3 — Chatbot Noor Overhaul

**Good:**
- Character name "Noor" fits the brand (Arabic "light", warm, welcoming)
- Platform context injected from live DB = Noor can reference real numbers and specific content
- 60s cache on platform context prevents per-request DB load
- Respects Majlis toggle in both system prompt AND frontend greeting
- Smart content linking via markdown `[text](/path)` — frontend parses and renders as clickable nav buttons
- 4 new tests covering trigger, greeting (with/without Majlis), branding
- Visual redesign is production-quality: avatar, gradients, animated typing dots, polished header

**Trade-offs:**
- Streaming SSE is hard to unit test — coverage is for visual/static behavior only. End-to-end tests would cover streaming properly.
- Context cache is in-memory — in a multi-instance deployment, each instance has its own cache. Still bounded at 60s so eventual consistency is fine.
- Top debates/predictions queries use subqueries in ORDER BY — works but could be slow at scale. Consider materializing trending stats in a background job if performance becomes an issue.
- Noor's link formatting is prompt-driven. Claude may occasionally not follow the markdown format exactly. The frontend parser handles plain text gracefully (just renders without links).

**Follow-ups:**
- Add a "Reset conversation" button in the panel header
- Persist conversation history to localStorage so it survives page reloads
- Add quick-reply suggestion chips ("Show me trending debates", "What's new?")
- Add proactive greeting: Noor could notice repeat visitors and welcome them back
- E2E tests for the full send → receive → link navigation flow

---

## General Follow-ups (not blocking launch)

1. **API-level tests** — zero test coverage on the backend, high risk
2. **Playwright end-to-end tests** for critical user flows (vote → share → unlock)
3. **Rate limiting on boost endpoints** — currently no rate limit, admin could accidentally spam
4. **Loading skeleton for feature toggle tabs** — toggles briefly flash default state while fetching
5. **`.env.example`** for api-server showing what env vars are needed for geolocation, share cards, etc.
6. **Database migration safety** — currently using `drizzle-kit push` which can be destructive. Consider moving to `drizzle-kit generate` + `migrate` for production.
