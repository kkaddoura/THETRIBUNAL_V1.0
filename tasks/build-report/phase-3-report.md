# Phase 3 — Experience Enhancement

Shipped the Chatbot "Noor" overhaul — the last item from the original 11.

---

## 3.1 Chatbot "Noor" Overhaul

**Commit:** `9d02dc3`
**Files:**
- `artifacts/api-server/src/routes/chatbot.ts` — complete rewrite: Noor character, live platform context injection, Majlis toggle awareness
- `artifacts/tmh-platform/src/components/Chatbot.tsx` — complete rewrite: avatar, branded bubbles, link parser, in-character greeting
- `artifacts/tmh-platform/src/components/__tests__/Chatbot.test.tsx` — NEW 4 tests

---

### Character

**Name:** Noor (Arabic: "light")
**Personality:** Warm, friendly, approachable — like a knowledgeable friend, not a corporate bot. Curious and thoughtful. Brief by default (2-3 sentences), expands on request. Natural conversational tone, no corporate filler.
**Tagline in panel header:** "Your guide to The Tribunal"

---

### Platform context injection

The API route fetches fresh platform data on each request (cached 60s) and injects it into the system prompt:

**Dynamic fields:**
- Total debate count (approved only)
- Total prediction count
- Total voice count
- Total pulse topic count
- Total votes cast (real + dummy)
- Top 5 trending debates (by combined vote count), each with id + title + category + vote count
- Top 5 predictions by engagement (id + title + category + YES %)
- Top 3 featured voices (id + name + role + company)
- `featureToggles.majlis.enabled` flag

**Caching:** `contextCache` in-memory, 60s TTL. Refreshes on next request after expiry. Safe because platform stats don't change second-to-second.

**Why this matters:** Noor can now say "Check out [this debate on Saudi Vision 2030](/debates/42) with 1,200 votes" — and the link actually works, because the content is drawn from live data, not hallucinated.

---

### Smart content linking

The system prompt instructs Noor to use markdown-style links whenever naming specific content:

```
[debate title](/debates/42)
[prediction title](/predictions/17)
[voice name](/voices/8)
```

The frontend `parseInlineLinks` function splits message content on the `[text](/path)` regex and renders each matched link as a `<button>` that calls `navigate(path)` + closes the panel. Preserves text between links as plain strings.

**Result:** Noor's responses become navigation-aware. Users can tap any mentioned content and jump directly to it.

---

### Majlis toggle awareness

When `featureToggles.majlis.enabled === false`:
- System prompt omits Majlis from the "Features" section entirely (Noor won't mention or offer it)
- Frontend greeting adapts:
  - Off: "Ask me about debates, predictions, MENA trends, or voices..."
  - On: "Ask me about debates, predictions, MENA trends, voices, or Majlis..."

Test coverage verifies both greetings render correctly.

---

### Visual redesign

**NoorAvatar** (reusable):
- Circular gradient: gold center → crimson edge → dark crimson outer
- Sparkles icon (Lucide) centered in white
- Subtle outer glow matching crimson theme
- Used in 3 places: trigger bubble, panel header, each assistant message

**Trigger bubble** (when closed):
- Horizontal pill: `[Avatar] ASK NOOR`
- Gradient background (crimson → darker crimson)
- Pulsing green status dot in corner (indicates online)
- Subtle scale animation on enter/exit

**Chat panel** (when open):
- Rounded 2xl with heavy shadow
- Red gradient header with decorative gold radial glow in top-right corner
- Noor avatar + "Noor." (with gold period, matching brand) + tagline with pulsing status dot
- Close button in top-right

**Message bubbles:**
- User messages: right-aligned, crimson gradient, rounded-2xl with sharp bottom-right corner
- Noor messages: left-aligned, small avatar + secondary background bubble with sharp bottom-left corner
- Whitespace preserved (line breaks), max-width 78%

**Typing indicator:**
- 3 animated dots bouncing in sequence (instead of plain "typing..." text)

**Input bar:**
- Rounded-full pill input
- Circular crimson gradient send button with hover scale
- Disclaimer: "Noor is powered by AI. Be kind — she's learning too."

---

### Functional scope covered

- ✅ Answer platform questions ("what is The Tribunal?", "how do debates work?")
- ✅ Link to specific content via markdown links
- ✅ Show basic stats (debate count, vote count, etc.) — injected into system prompt
- ✅ Context-aware: knows current top debates, predictions, voices
- ✅ Visual upgrade: avatar, branded bubbles, greeting, header
- ✅ Respects Majlis toggle

---

### Test coverage

4 new tests in `Chatbot.test.tsx`:
1. Trigger bubble renders with "Ask Noor" text
2. Greeting excludes Majlis when toggle is off
3. Greeting includes Majlis when toggle is on
4. Branding icons (Sparkles) present

Total suite now: **20 tests passing** across 3 files.

---

### Human verification checklist

- [ ] Open the website — "Ask Noor" pill appears bottom-right with pulsing green dot
- [ ] Click it → panel slides in with Noor avatar, red gradient header, greeting message
- [ ] Greeting matches Majlis toggle state (check both on and off)
- [ ] Type "what is The Tribunal?" → Noor responds warmly with a brief overview
- [ ] Type "show me a trending debate" → Noor replies with a link like "[title](/debates/42)"
- [ ] Click the link → debate page opens, panel closes automatically
- [ ] Type "how many votes have been cast?" → Noor responds with the actual total from the DB
- [ ] Type something off-topic (e.g., "what's the weather?") → Noor redirects gently
- [ ] With Majlis toggle OFF: type "can I join Majlis?" → Noor doesn't offer it (says it's not available or redirects)
- [ ] Close panel, reopen → greeting persists (same conversation)
- [ ] Typing indicator shows animated dots while waiting
- [ ] Mobile: panel is responsive, fits screen
