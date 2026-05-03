# Impact Analysis — Blast Radius & Human Testing Priorities

What's affected by these changes and where to look for regressions.

---

## High-risk areas (test thoroughly before launch)

### 1. Public voting endpoint (`POST /polls/:id/vote`)

**Changed in:** Phase 1.2 (vote updates), Phase 1.5 (dummy votes), Phase 2.1 (IP consent)

**What's different:**
- Accepts `ipConsent` field in request body
- Returns `changed: boolean` flag
- Responses now include `voteCount = real + dummy` (not just real)
- Vote updates atomically decrement old option and increment new
- Geolocation lookup is gated on `ipConsent`

**Could break:**
- Any existing client that expects old response shape
- Mobile app (if exists) — the API contract changed
- Analytics pipelines reading poll vote counts

**Test:**
- Cast a new vote → verify response has correct shape
- Change vote → verify counts shift (old -1, new +1)
- Cast same vote twice → verify `unchanged: true` returned

---

### 2. Public API response shapes (polls + predictions)

**Changed in:** Phase 1.5

**What's different:**
- `GET /polls` → each poll's `totalVotes` and option `voteCount` now include dummy votes
- `GET /predictions` → `yesPercentage`, `noPercentage`, `totalCount`, `optionResults` all reflect combined counts
- `GET /polls/:id`, `GET /predictions/:id` → same

**Could break:**
- Any external consumer or dashboard that sums vote counts expecting them to match `votes` table rows — they won't match anymore
- Export scripts
- Trend chart if it's showing dummy-inflated numbers suddenly jumping

**Test:**
- Spot-check a few polls on the frontend → counts should be sensible
- Check trend chart on a debate detail → no weird spikes

---

### 3. Profiles public API

**Changed in:** Phase 1.1

**What's different:**
- `GET /profiles` and `GET /profiles/:id` now filter by `editorialStatus = 'approved'`
- Previously returned all profiles regardless of status

**Could break:**
- Any previously-cached profile pages pointing to now-archived voices → 404
- Link farms / SEO if search engines indexed archived voices (they're gone now)
- Profile detail page's "similar profiles" feature — now only shows approved similar voices

**Test:**
- Verify approved voices all still show
- Verify archived voices return 404 on detail pages
- Check homepage featured voices grid still works

---

### 4. PollCard component (used everywhere)

**Changed in:** Phase 1.2, 1.6, 2.1, 2.2

**Used by:**
- `/debates` listing page
- `/debates/:id` detail page
- Homepage featured poll
- Potentially other places

**What's different:**
- Vote flow: no confirmation
- Result bars are now clickable to change vote
- Uses `PollViewToggle` instead of direct `ResultsBreakdown`
- Share-to-Majlis button gated on `featureToggles.majlis.enabled`
- Email unlock gated on `featureToggles.emailCapture.enabled`
- Passes full poll data to `ShareModal` for image generation
- Vote body includes `ipConsent`

**Test every place `PollCard` is rendered:**
- Homepage featured poll card
- Debates listing cards
- Debate detail page (large featured card)
- Any other pages/modals using it

---

### 5. Feature toggles propagation

**Changed in:** Phase 1.6

**Cache behavior:** `useSiteSettings` has `staleTime: 300_000` (5 min). Open tabs might not see toggle changes for up to 5 minutes.

**Test:**
- Change a toggle in CMS → open website in **new** incognito tab → verify change is visible
- For existing tabs, may need hard reload (Cmd+Shift+R)

**If urgent toggle change needed in production:** Either reduce `staleTime` to something smaller (30s) or ship a push-based update (WebSocket/SSE).

---

## Medium-risk areas

### 6. Chatbot system prompt (✅ now respects Majlis toggle)

**Fixed in Phase 3:** The chatbot API route now fetches `site_settings` config, reads `featureToggles.majlis.enabled`, and omits Majlis from the system prompt entirely when off. The frontend greeting also adapts. Context cached 60s — toggle changes propagate within a minute.

### 7. OG tags middleware

**Changed in:** Phase 2.2 (description now includes leading option + vote count)

**Could break:** Existing SEO — search engines may re-crawl and see the new description. Generally positive (richer description) but worth monitoring.

### 8. Vote snapshot cron / trend chart

**Indirectly affected by:** Phase 1.5 (dummy votes)

When a new vote is cast, the snapshot includes **combined** (dummy + real) counts. The trend chart will show dummy-inflated numbers in historical data. If you want "real votes only" trends, the snapshot logic needs updating.

---

## Low-risk areas

- FAQ page text change (Telegram → Instagram) — cosmetic
- Home page share dropdown (Telegram button → Instagram button) — cosmetic
- CMS ideation category dropdown (cleaner list) — doesn't affect existing ideation sessions
- CMS dashboard cards (new Vote Counts + Boost sections) — additive, doesn't affect existing dashboard

---

## Breaking changes summary (for changelog)

- **`POST /polls/:id/vote`** — now supports vote updates, request body adds optional `ipConsent`, response changes:
  - `alreadyVoted: true` → now means "tried to vote when existing vote found but couldn't update due to race"
  - New `changed: boolean` → `true` if this was a vote change
  - New `unchanged: true` → returned when same option clicked twice
- **`GET /polls`** — `totalVotes` and `options[].voteCount` now include dummy votes
- **`GET /predictions`, `/predictions/:id`** — percentages and total counts include dummy votes
- **`GET /profiles`, `/profiles/:id`** — now filter by `editorialStatus = 'approved'` (removes archived/draft from public view)
- **Schema:** 3 new columns (`poll_options.dummy_vote_count`, `predictions.dummy_total_count`, `predictions.dummy_option_results`)

---

## Things still to do (follow-up work)

### Wiring colored punctuation to other pages (~5 lines each)

For each public page with a hero title that currently uses a hardcoded `<span className="text-primary">.</span>`:

1. **Add to page's config interface (CMS side):**
```ts
titlePunctuation?: TitlePunctuationConfig
```

2. **Add editor UI (CMS page editor):**
```tsx
<TitlePunctuationEditor
  value={config.titlePunctuation}
  onChange={(punct) => setConfig({ ...config, titlePunctuation: punct })}
/>
```

3. **Add to config interface (public page):**
```ts
titlePunctuation?: { character?: string; color?: string; fontStyle?: "normal" | "italic"; fontWeight?: "normal" | "bold" }
```

4. **Replace hardcoded period:**
```tsx
// Before:
<h1>Title<span className="text-primary">.</span></h1>
// After:
<h1>Title<TitlePunctuation config={pageConfig?.titlePunctuation} /></h1>
```

Pages still to wire:
- FAQ (`page-faq.tsx` + `faq.tsx`)
- Contact (`page-contact.tsx` + `contact.tsx`)
- Terms (`page-terms.tsx` + `terms.tsx`)
- Apply (`page-apply.tsx` + `apply.tsx`)
- Predictions (`page-predictions.tsx` + `predictions.tsx`)
- Pulse (`page-pulse.tsx` + `mena-pulse.tsx`)
- Debates listing hero (`polls.tsx`)
- Voices listing hero (`profiles.tsx`)

### Phase 3 — Chatbot "Noor" overhaul (✅ shipped)

See `phase-3-report.md` for full details. All objectives met:
- ✅ Noor character (Arabic "light")
- ✅ Visual redesign (avatar, branded bubbles, header, greeting)
- ✅ Smart content linking via markdown `[text](/path)` parser
- ✅ Respects `featureToggles.majlis` in both API and frontend
- ✅ Platform context injected from live DB (stats, top trending, featured voices)

**New impact area:** Chatbot now depends on:
- `pollOptionsTable` (for dummy_vote_count column — already migrated)
- `predictionsTable.dummy_total_count`
- `pulseTopicsTable` (new import)
- `cmsConfigsTable` for site settings lookup
- All reads are SELECT-only, low risk

### Per-poll OG images (for LinkedIn/Twitter preview cards)

- Add server-side image generation endpoint
- Options: `@napi-rs/canvas`, Satori + Sharp, or Cloudflare Workers
- Current OG middleware just uses a static default image
