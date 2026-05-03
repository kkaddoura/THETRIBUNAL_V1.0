# The Tribunal Platform - QA Development Report

**Date**: 2026-04-03
**Files Changed**: 60 | **Lines Added**: ~2,100 | **Lines Removed**: ~620

---

## Legend

- [x] Done and verified
- [~] Partially done / needs review
- [ ] Not implemented

---

## Predictions Page

- [x] Featured Prediction - share option added (Share2 button + Majlis share)
- [x] Predictions page - share to unlock WhatsApp hover fixed (cursor-pointer on all share buttons)
- [~] Share to unlock after email - gate logic improved in PollCard, needs manual QA to confirm flow works end-to-end
- [x] No option to deselect votes - click voted option to deselect, with confirmation dialog
- [x] No confirmation when casting votes - full confirm/cancel/change overlay added
- [x] "Resolves: Dec 2028" - font size increased to 15px with bold weight
- [x] Category info ("Category: Economy & Finance...") - changed from expanding to (i) button tooltip, no layout shift
- [x] Odd number predictions layout - last card on odd row gets `md:col-span-2 md:max-w-[calc(50%)] md:justify-self-center`
- [x] Prediction card titles link to `/predictions/:id` detail page
- [~] Predictions don't communicate actual results - confidence bars show %, closed section exists, but no explicit outcome/result field per prediction
- [~] Prediction cards missing source/timeline/resolution criteria - resolves date shown, no source field in data model
- [ ] Votes by Country shows "No country data yet" - not tracking IP, feature not implemented (listed as planned in FAQ)
- [~] Backend/frontend prediction count mismatch - backend correctly syncs totalCount on vote, needs data verification
- [x] **NEW: Prediction Detail Page** created (`/predictions/:id`) with chart, vote, share, related sidebar

---

## Debates Page

- [x] Default filter changed to **trending** instead of latest
- [x] Voted option position fixed - options preserve original display order on re-render (PollCard.tsx merge logic)
- [x] Debates search fixed - reworked scoring with word-level matching across question/category/tags
- [x] Filters sidebar made sticky (`lg:sticky lg:top-20 lg:self-start`), only cards scroll
- [x] Filter counts shown in brackets (e.g., "Trending (45)")
- [x] Categories "View More" expand - shows first 5, expandable button for rest
- [x] Sort by toggle with wave animation - 3-tab sliding pill with cubic-bezier easing
- [x] Debates detailed screen - proper `PollDetailSkeleton` loader replacing black screen
- [x] Right side of debate detail - filled with related debates sidebar (5 cards, sticky, vote CTA)
- [ ] "Weigh in" text still exists in PollCard.tsx line 312 - not renamed to "Debates"
- [ ] Hover slide from red to white animation - not implemented

---

## Share Functionality

- [x] Copy to clipboard on all share buttons (WhatsApp, LinkedIn, X) - copies before opening external URL
- [x] Instagram already had clipboard copy
- [ ] Reddit share option - not present in current ShareModal
- [x] Share gate respects CMS `shareGateEnabled` setting (PollCard phase logic)

---

## Pulse Page

- [x] Share button moved to card - visible without expanding
- [x] Page title changed from "MENA Pulse" to "Pulse"
- [x] URL route is `/pulse` (not `/mena-pulse`)

---

## About Page

- [x] Founding Voices number color fixed - `text-gray-900 dark:text-white`
- [x] Active Debates number color fixed - same treatment
- [x] MENA Countries number color fixed - same treatment
- [x] People in MENA number color fixed - same treatment
- [x] "What We Stand For" decorative numbers - bumped from 8% to 20% opacity in both modes

---

## Navigation

- [x] About nav moved to first position (already was first)

---

## Forms

- [x] Apply page (`apply.tsx`) - custom inline validation with red borders and error messages below inputs
- [x] Contact page (`contact.tsx`) - same custom validation treatment
- [ ] Join page - not verified/updated

---

## Font & Typography

- [x] Base font size bumped from 16px to 17px (`html { font-size: 17px }`)
- [x] Full golden ratio type scale CSS variables added (2xs through 5xl)
- [x] Line height variables added

---

## SEO & Open Graph

- [x] `useMetaTags` hook created - sets og:title, og:description, og:image, og:url, og:type, twitter:card
- [x] `usePageTitle` updated to wrap `useMetaTags` (backwards compatible)
- [x] `index.html` updated with default OG meta tags
- [x] All 18 pages call `usePageTitle` with title + description config
- [x] Server-side OG tags middleware exists (`ogTags.ts`)
- [~] Note: SPA client-side meta tags won't work for social crawlers (WhatsApp/Twitter/Facebook). The `ogTags.ts` server middleware handles this for SSR-like injection, but needs verification that it's actually intercepting requests correctly.

---

## Chatbot

- [x] Backend API route created (`/api/chatbot/message`) using Anthropic Claude API
- [x] Frontend `Chatbot.tsx` - floating widget, bottom-right, open/close animation
- [x] Integrated in `App.tsx` - appears on all pages
- [x] System prompt includes full platform context
- [x] Uses `ANTHROPIC_API_KEY` env var, model `claude-sonnet-4-20250514`

---

## Error Boundary

- [x] ErrorBoundary present and wrapping all routes in App.tsx
- [x] Fallback UI with retry, homepage, and report issue buttons

---

## Content Verification (Audit Only - No Changes Made)

| Claim | Where | Status |
|-------|-------|--------|
| 541M People in MENA | Site-wide | Consistent with their 19-country list (~534M) |
| 19 MENA Countries | Site-wide | Valid editorial choice, but Mauritania referenced in Pulse but excluded from list |
| 94 Founding Voices | About | Conflicts with FAQ (100+) and Home fallback (103) |
| 135+ Active Debates | About | Conflicts with Home fallback (422) |
| 36 trend cards | About | Conflicts with FAQ (50+) and actual fallback data (78) |
| 8 categories (Pulse) | About/Pulse | Correct |
| Voice search UAE shows 84 | Profiles | Dynamic from API, not hardcoded - data issue if wrong |

---

## Not Implemented (Needs Future Work)

- [ ] "Weigh in" rename to "Debates" in PollCard
- [ ] Hover slide animation (red to white on current position)
- [ ] Reddit share option
- [ ] Predictions journey/recommendations page (detail page created, but no recommendation algo)
- [ ] Recommendation algorithm for user engagement
- [ ] Delete old yes/no debates (data operation, not code)
- [ ] Populate Majlis chat with more data / dummy credentials
- [ ] Delete existing Majlis chat messages and add newer ones (data operation)
- [x] Binary vs multiple choice poll UI - Full dynamic rendering: binary (side-by-side YES/NO), hot_take (colored agree/disagree), scale (horizontal rating), multiple_choice (stacked). CMS pollType values aligned. cardLayout now persists to DB.
- [ ] Improve debate question quality (content writing task - use content writer skill)
- [ ] FAQ content updates (content writing task)
- [ ] Voices content updates (content writing task)
- [ ] Verify all numbers are correct (content decision needed from client)
- [ ] Newsletter submissions saving to CMS Subscribers / email marketing service
- [ ] Join page form validation
- [ ] Votes by Country analytics (requires IP geolocation)

---

## New Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `pages/prediction-detail.tsx` | 453 | Full prediction detail view |
| `hooks/use-meta-tags.ts` | 62 | OG/Twitter meta tag management |
| `components/Chatbot.tsx` | ~200 | AI chatbot floating widget |
| `api-server/routes/chatbot.ts` | ~100 | Claude API chatbot endpoint |

---

## How to Test

```bash
# Install dependencies
pnpm install

# Start API server
cd artifacts/api-server && pnpm dev

# Start frontend
cd artifacts/tmh-platform && pnpm dev

# TypeScript check (should be clean)
npx tsc --noEmit --project artifacts/tmh-platform/tsconfig.json
```

### Key Pages to QA
- `/predictions` - vote confirmation, deselect, odd layout, category tooltip
- `/predictions/:id` - new detail page
- `/debates` - trending default, search, sticky filters, sort toggle animation
- `/debates/:id` - skeleton loader, related sidebar
- `/pulse` - title says "Pulse", share on card
- `/about` - stat colors in light/dark mode
- `/apply` - form validation (submit empty to see red errors)
- `/contact` - form validation
- Chatbot bubble (bottom-right on every page)
