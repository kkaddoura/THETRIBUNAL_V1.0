# QA Checklist — Human Testing Before Launch

Organized by feature area. Check each item and mark ✅ / ❌ / ⚠️ (needs fix).

## Prerequisites

- [ ] DB migration applied (`0004_dummy_votes.sql` — adds dummy count columns)
- [ ] Seed script run (populated 20-70 dummy votes per approved item)
- [ ] All apps running: api-server (3001), cms (5173), tmh-platform (5174)
- [ ] CMS login works with current credentials

---

## Phase 1.1 — Voices Status Filtering

- [ ] Open CMS → Voices page, identify a voice to test
- [ ] Change its status to "Draft" → Save
- [ ] Reload public `/voices` → verify the voice is **not** shown
- [ ] Try navigating directly to `/voices/<that id>` → should return 404 "Profile not found"
- [ ] Change status to "In Review" → save → still hidden publicly
- [ ] Change status to "Archived" → save → still hidden publicly
- [ ] Change status back to "Approved" → save → voice reappears in both list and detail

---

## Phase 1.2 — Vote Confirmation Removed

### Debates (Polls)
- [ ] Navigate to `/debates` listing → click a poll card's option
- [ ] Verify: instant vote, no confirmation modal, no lock-in state
- [ ] Verify: results view appears (or share gate if enabled)
- [ ] In results view, click a **different** option
- [ ] Verify: percentages update immediately, your red highlight moves
- [ ] Verify: total vote count stays the same (you changed, not added)
- [ ] Refresh the page → your new vote should persist
- [ ] Click the same option you already voted for → nothing happens (no-op)

### Predictions (listing page)
- [ ] Navigate to `/predictions` → click YES or NO on any card
- [ ] Verify: instant vote, no confirmation modal, no "Change vote" link needed
- [ ] Click the other option → vote changes instantly (no modal)
- [ ] No dimmed/locked-out options after voting

### Predictions (detail page)
- [ ] Navigate to `/predictions/:id` → cast a vote
- [ ] Verify: instant vote, no confirmation overlay
- [ ] Click a different option → instant change
- [ ] Verify: 3-tab view (Results / By Country / Over Time) appears
- [ ] "By Country" tab shows "Still Gathering Data" empty state
- [ ] "Over Time" tab shows "Still Gathering Data" empty state
- [ ] "Results" tab shows the confidence bars + vote buttons

---

## Phase 1.3 — Telegram Removed

- [ ] Navigate to homepage → open the share dropdown (wherever it appears)
- [ ] Verify: Instagram is in the list, Telegram is NOT
- [ ] Navigate to `/faq` → search for "Telegram" → should find none
- [ ] Grep frontend source: `grep -ri telegram artifacts/tmh-platform/src` → only `ogTags.ts` should match (bot crawler regex is OK to keep)

---

## Phase 1.4 — CMS Ideation Category Dedup

- [ ] Open CMS → Ideation
- [ ] Set mode to "Focused" → pillar to "Debates"
- [ ] Open the Categories multi-select → verify clean list (no duplicates like "Education" AND "Education & Workforce")
- [ ] Change pillar to "Predictions" → list should show prediction categories
- [ ] Switch to "Explore" mode → merged list should also be clean (dedup by case-insensitive match)

---

## Phase 1.5 — Dummy Votes System

### Migration + seed
- [ ] `pnpm --filter @workspace/db run push` — schema migration applies cleanly
- [ ] Check DB directly: `poll_options` has `dummy_vote_count` column
- [ ] Check DB: `predictions` has `dummy_total_count` and `dummy_option_results` columns
- [ ] `pnpm -C scripts tsx src/seed-dummy-votes.ts` — runs without errors
- [ ] Script logs "Seeded dummy votes for N debates" and "Seeded dummy votes for M predictions"

### Public website
- [ ] Open `/debates` → each poll card shows realistic-looking vote counts (20-70 range, not all 50/50)
- [ ] Binary polls show a skewed ratio (not 50/50)
- [ ] Multi-option polls show a natural distribution (leading option is clearly ahead)
- [ ] Vote on a real poll → count increases by 1, ratio recalculates
- [ ] Open `/predictions` → each prediction shows dummy vote counts > 0

### CMS dashboard
- [ ] Open CMS dashboard → "Vote Counts" card appears
- [ ] Shows Debates: Real | Dummy | Total
- [ ] Shows Predictions: Real | Dummy | Total
- [ ] "Boost Votes" section appears with "Boost All" button + per-category buttons
- [ ] Click "Boost All" → dummy counts increase by some amount (2-10% of current)
- [ ] Success toast shows "Boosted N debates and M predictions"
- [ ] Click a category button → only that category's items boosted
- [ ] Vote on a real poll → "Real" count in dashboard ticks up, "Dummy" stays the same

---

## Phase 1.6 — Feature Toggles

### Majlis Toggle
- [ ] CMS → Site Settings → Feature Toggles tab → Toggle Majlis OFF → Save
- [ ] Reload public website
- [ ] Homepage: no "Enter The Majlis" button
- [ ] Voices page: no "Enter The Majlis" button in hero
- [ ] Navbar: no "The Majlis" link
- [ ] Debate card: no Share-to-Majlis button (MessageSquare icon)
- [ ] Direct URL `/majlis` → redirects to home
- [ ] Direct URL `/majlis/login` → redirects to home
- [ ] Toggle Majlis ON → save → all Majlis UI returns

### Share Gate Toggle
- [ ] Toggle Share Gate OFF → save
- [ ] Vote on a debate → results show immediately, no gate modal
- [ ] Toggle Share Gate ON → save
- [ ] Vote on a new debate (use incognito) → gate modal appears

### Email Capture Toggle
- [ ] Toggle Email Capture OFF → save
- [ ] Vote on a debate → share gate shows, but no email input / "Unlock Results" form
- [ ] Only social share buttons visible
- [ ] Toggle Email Capture ON → save → email form reappears

### IP Consent Toggle
- [ ] Toggle IP Consent ON → save
- [ ] Incognito window → visit any page → banner appears bottom-right after ~600ms
- [ ] Click Accept → banner disappears → vote on debate → DB `votes.country_code` should be populated
- [ ] Clear localStorage, reload → banner reappears
- [ ] Click "No Thanks" → vote on debate → `votes.country_code` should be null

---

## Phase 2.1 — 3-Tab Results View (Debates)

- [ ] Open any debate → vote → results appear inside a 3-tab view
- [ ] Verify 3 tabs: **Results** (BarChart3 icon) / **By Country** (Globe) / **Over Time** (TrendingUp)
- [ ] Default tab is "Results" — shows vote bars, personal insight card, "Voted — Results Live"
- [ ] Vote bars are clickable to change vote (hover shows color change)
- [ ] Click "By Country" → shows country breakdown OR "Still Gathering Data" empty state
- [ ] Click "Over Time" → shows trend chart OR "Still Gathering Data" empty state
- [ ] Click back to "Results" → vote bars reappear
- [ ] Only ONE view shows at a time (no stacked bars + breakdown)
- [ ] Share button appears BELOW the tab view (not inside it)
- [ ] Tabs work on listing page cards too (inside PollCard)

---

## Phase 2.2 — Share Templates

### Desktop
- [ ] Vote on a debate → click Share icon → Share modal opens with poll data passed
- [ ] Click "Download Share Card" → PNG downloads
- [ ] Open the PNG → verify:
  - [ ] Black gradient background with subtle red corner accent
  - [ ] Red bar accent above "THE TRIBUNAL" brand header
  - [ ] Red period after "THE TRIBUNAL" (matches site)
  - [ ] Category badge in top-right (if poll has category)
  - [ ] Full question wrapped properly, no cutoff
  - [ ] Results bars for up to 4 options, voted option highlighted red
  - [ ] Footer with "N VOTES · JOIN THE DEBATE" and "TRIBUNAL.COM"
- [ ] Click LinkedIn → text copied, PNG downloaded, LinkedIn opens
- [ ] Click Instagram → story-sized PNG (1080×1920) downloads
- [ ] Click X → text copied, X opens

### Mobile (if possible)
- [ ] Vote → share → WhatsApp → native share sheet opens with image file attached
- [ ] Verify the image can be sent directly through WhatsApp

### OG meta (LinkedIn preview)
- [ ] Paste a debate URL into LinkedIn composer → wait for preview
- [ ] Verify description shows leading option and vote count (e.g., "67% say 'YES'. 1,234 MENA voices weighed in.")
- [ ] Image will still be the default cover (no per-poll dynamic image yet — documented follow-up)

---

## Phase 2.3 — Colored Punctuation

- [ ] CMS → About Page editor → scroll to "Title Punctuation" section
- [ ] Verify default is `.` in red, bold, normal
- [ ] Change character to `?` → live preview updates
- [ ] Change color to Gold → live preview updates
- [ ] Enable Italic → live preview updates
- [ ] Save → reload public `/about`
- [ ] Verify hero title shows gold italic bold `?` instead of red period
- [ ] Change back to red period → save → reload → verify

**Not yet wired (follow-up):** FAQ, Contact, Terms, Predictions page, Pulse page, Debates listing hero, Voices listing hero, Profile detail. Each takes ~5 lines to extend (see `impact-analysis.md`).

---

## Phase 3 — Chatbot Noor

### Visual + entry point
- [ ] Open the website → "Ask Noor" pill bubble appears bottom-right
- [ ] Pill has Noor avatar (gold/red gradient with sparkles) + "ASK NOOR" text
- [ ] Small green pulsing dot in top-right corner of pill
- [ ] Click pill → panel slides in from bottom-right
- [ ] Header: red gradient with gold radial glow, Noor avatar, "Noor." name with gold period, "Your guide to The Tribunal" tagline with pulsing green dot
- [ ] Close button (X) in top-right works

### Greeting
- [ ] Greeting appears as first Noor message when panel opens
- [ ] Says "Hi — I'm Noor, your guide to The Tribunal. ✨"
- [ ] Second paragraph mentions debates, predictions, MENA trends, voices
- [ ] If Majlis toggle is ON, greeting also mentions Majlis
- [ ] If Majlis toggle is OFF, greeting does NOT mention Majlis

### Conversation
- [ ] Type "what is The Tribunal?" → Noor responds warmly, briefly, natural tone
- [ ] Type "show me a trending debate" → Noor replies with a markdown link like `[title](/debates/X)`
- [ ] Link in Noor's message is clickable (crimson, bold)
- [ ] Clicking the link navigates to the debate → panel closes automatically
- [ ] Reopen panel → conversation history preserved
- [ ] Type "how many votes?" → Noor responds with actual numbers from DB context
- [ ] Type off-topic ("weather?") → Noor gently redirects
- [ ] With Majlis OFF: type "tell me about Majlis" → Noor doesn't pitch Majlis (or says unavailable)
- [ ] With Majlis ON: type "tell me about Majlis" → Noor explains and links to /majlis

### Typing indicator
- [ ] While waiting for response: 3 bouncing dots show in a Noor message bubble
- [ ] When first token arrives: dots replaced with streaming text

### Input
- [ ] Input is rounded-full pill, "Ask Noor anything..." placeholder
- [ ] Send button is circular, crimson gradient, disabled when input empty
- [ ] Enter key sends message
- [ ] Shift+Enter does NOT send (reserved for newlines, though single-line input)
- [ ] While sending: send button shows spinner

### Mobile
- [ ] Panel fits mobile viewport (max-width calc prevents overflow)
- [ ] Trigger bubble stays bottom-right on scroll

### API / backend
- [ ] Check CMS dashboard stats — Noor should reference these numbers in responses
- [ ] After changing Majlis toggle in CMS, wait ~60s, refresh panel → new greeting + Noor no longer mentions Majlis
- [ ] Rate limit works: send 30+ messages in 15 min → error toast/message

---

## Regression Checks (existing features should still work)

- [ ] Can log into CMS with existing credentials
- [ ] CMS Dashboard loads without errors
- [ ] Can create/edit/delete a debate in CMS
- [ ] Can create/edit/delete a prediction
- [ ] Can create/edit/delete a voice profile
- [ ] Public homepage loads with all sections
- [ ] Predictions listing page loads
- [ ] Pulse page loads
- [ ] Voices listing works + ticker still animates
- [ ] Chatbot still opens and responds (unchanged this session)
- [ ] Newsletter signup via share gate still works (email reaches backend)
- [ ] Design tokens in CMS still editable
- [ ] Analytics stats still show in CMS

---

## Blockers to fix before launch

- [ ] (fill in as found)

## Late Bug Fixes (after main QA checklist was written)

### Categories count fix
- [ ] Homepage "debates" count shows 100
- [ ] Debates listing "All Topics (N)" count also shows 100
- [ ] These two numbers match

### Share Copy text fix
- [ ] On any debate results → share modal → click "Copy" button
- [ ] Paste clipboard content → should be full formatted text + URL (not just URL)
- [ ] On the gate overlay → click "Copy" icon → same: full text + URL

### Noor chatbot background fix
- [ ] Open Noor → panel has a solid background (not transparent/see-through)
- [ ] Messages area has a solid background
- [ ] Noor message bubbles have bg-secondary (visible, not transparent)

---

## MANUAL testing only (agent-browser cannot verify)

- [ ] Share a debate URL on WhatsApp → image + text appear in the share
- [ ] Paste a debate URL into LinkedIn composer → preview card shows enriched description with vote counts
- [ ] Download "Share Card" PNG → open it → verify it looks professional (branded header, results bars, category badge)
- [ ] Download Instagram story PNG → verify 1080x1920 vertical format
- [ ] Open Noor chatbot → type "show me a trending debate" → verify the link in response actually navigates correctly
- [ ] Test on mobile device (or small viewport) → Noor panel fits, debate cards readable, share modal usable
- [ ] CMS → Site Settings → Feature Toggles → test each toggle independently (save, reload website, verify)

## Known limitations (ship anyway)

- ip-api.com free tier uses HTTP — may need upgrade to paid/alt provider if strict HTTPS enforcement is needed
- LinkedIn OG image is static (not per-poll) — requires server-side image generation (deferred)
- Chatbot "Noor" character overhaul: ✅ Phase 3 shipped. Streaming SSE responses are hard to mock in unit tests — fully tested via manual QA
