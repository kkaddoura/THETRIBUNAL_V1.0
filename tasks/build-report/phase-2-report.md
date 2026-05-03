# Phase 2 — Core Improvements

Shipped quality/capability items. All 3 are in `main`.

---

## 2.1 IP Consent Banner + Country View Toggle

**Commit:** `fd4ecbb`
**Files:**
- `artifacts/tmh-platform/src/components/IpConsentBanner.tsx` — NEW banner component
- `artifacts/tmh-platform/src/components/poll/PollViewToggle.tsx` — NEW tab switcher (By Country | Over Time)
- `artifacts/tmh-platform/src/components/poll/PollCard.tsx` — swapped `ResultsBreakdown` for `PollViewToggle`, passes `ipConsent` in vote requests
- `artifacts/tmh-platform/src/App.tsx` — mounts `IpConsentBanner` globally
- `artifacts/api-server/src/routes/polls.ts` — implemented `getCountryFromIp` using ip-api.com with in-memory caching
- `lib/api-client-react/src/generated/api.schemas.ts` — added `ipConsent?: boolean` to `VoteRequest` type

**Behavior:**
- **Banner:** Only shows when `featureToggles.ipConsent.enabled === true` in CMS AND user hasn't already decided. Bottom-right fixed position (mobile: full-width bottom). "Accept" or "No Thanks" — choice persisted in `localStorage['tmh_ip_consent']`.
- **Vote flow:** Client sends `ipConsent: consent !== "rejected"` in the vote body. If rejected, server skips geolocation lookup and stores `country_code: null`.
- **Geo API:** Uses free ip-api.com endpoint (45 req/min limit), caches up to 5000 IPs in-memory. 3s timeout. Private/loopback IPs bypass the lookup.
- **View toggle:** On `PollCard` results view, users see tabs "By Country" (existing `ResultsBreakdown`) and "Over Time" (existing `TrendChart`). Default is "By Country".

**Note:** ip-api.com free tier does **not** support HTTPS without a key. The code uses `http://`. In production, you may want to upgrade to a paid tier or swap to a different provider (ipinfo.io) that supports HTTPS. If the server runs behind HTTPS-only networking, the HTTP call should still succeed since it's a server → server request.

**Human verification:**
1. CMS → Site Settings → Feature Toggles → enable IP Consent → save
2. Open website in an incognito window → banner should appear after ~600ms
3. Click "Accept" → banner dismisses → cast a vote → check DB: `votes.country_code` should be populated
4. Clear localStorage, reopen → banner appears again
5. Click "No Thanks" → cast a vote → `votes.country_code` should be null
6. Open a debate → click "Over Time" tab → trend chart should render
7. Click "By Country" → country breakdown should render

---

## 2.2 Share Template Overhaul

**Commit:** `3f05f3e`
**Files:**
- `artifacts/tmh-platform/src/lib/shareCard.ts` — complete rewrite: gradient backgrounds, category badge, results bars, brand header with red period, quality copy, new `shareWithImage` helper
- `artifacts/tmh-platform/src/components/ShareModal.tsx` — rewrite: accepts poll data (category, totalVotes, votedOption, options), generates image per share action, Web Share API with file attachment on mobile + download on desktop, platform-specific share text templates
- `artifacts/tmh-platform/src/components/poll/PollCard.tsx` — passes full poll data to `ShareModal`
- `artifacts/api-server/src/middlewares/ogTags.ts` — OG meta description now includes the leading option's percentage and vote counts (e.g., "67% say 'YES'. 1,234 MENA voices weighed in.")

**Visual improvements:**
- Gradient black background with subtle red corner accent
- Brand header: red accent bar + "THE TRIBUNAL" + red period + "BY THE MIDDLE EAST HUSTLE"
- Category badge in top-right corner (if provided)
- Large headline with wrap + ellipsis truncation
- Full results bars for up to 4 options (voted option highlighted in red)
- Footer with vote count + domain
- Instagram story card (1080×1920) gets larger type and a big red CTA block at the bottom

**Sharing improvements:**
- WhatsApp: generates image + opens `wa.me` with formatted text containing the poll URL
- LinkedIn: copies formatted multi-line text, downloads the image, opens LinkedIn sharer (user pastes text + uploads image)
- X/Twitter: generates image + opens intent URL
- Instagram: generates story-sized image + opens Instagram (user pastes link in Story)
- "Download Share Card" button for manual sharing
- Loader spinner on each button during generation
- All buttons disabled while any card is generating

**Platform-specific copy:**
- WhatsApp: `🔴 "question" — I voted "X" on The Tribunal... URL`
- LinkedIn: Multi-line with vote count context
- X: `@TMHustle` mention + the voted option
- Instagram: image-first, link as fallback text

**Note on LinkedIn previews:** The OG meta middleware already generates richer descriptions per poll, but the `og:image` still points to the static `DEFAULT_IMAGE`. For truly per-poll LinkedIn previews, a server-side image generation endpoint would be required (e.g., `@napi-rs/canvas` or similar). This was skipped to avoid adding heavy native dependencies. LinkedIn now shows a richer description; upgrade path documented in `impact-analysis.md`.

**Human verification:**
1. Open any debate → vote → open the Share modal (on results page)
2. Click "Download Share Card" → verify the downloaded PNG looks professional (category badge, branded header, results bars, footer)
3. On mobile: click WhatsApp → native share sheet should open with image attached
4. On desktop: click LinkedIn → image downloads, text copied, LinkedIn opens
5. Click Instagram → story-sized PNG downloads
6. Click "X" → text copied to clipboard, X opens
7. Share a debate URL directly to a test LinkedIn post (paste only the URL) → preview card should show the richer description including vote count

---

## 2.3 Colored Punctuation in CMS

**Commit:** `d655bc4`
**Files:**
- `artifacts/tmh-platform/src/components/TitlePunctuation.tsx` — NEW render component
- `artifacts/cms/src/components/TitlePunctuationEditor.tsx` — NEW CMS form component with live preview
- `artifacts/cms/src/pages/page-about.tsx` — wired into About page editor
- `artifacts/tmh-platform/src/pages/about.tsx` — replaced hardcoded red period with `<TitlePunctuation config={...} />`

**Config shape:**
```ts
{
  character?: string   // e.g., ".", "?", "!"
  color?: string       // hex, default "#DC143C"
  fontStyle?: "normal" | "italic"
  fontWeight?: "normal" | "bold"
}
```

**Controls in CMS:**
- Text input (3 char max) for character
- Color dropdown: Red, Gold, White, Green, Blue, Purple, Orange
- Font Style: Normal / Italic
- Weight: Normal / Bold
- Live preview showing "Sample Title" with the current styling

**Default:** Red period (`#DC143C`), bold, normal style — matches existing brand.

**Scope:** Implemented on the About page as the reference pattern. Other pages (FAQ, Contact, Terms) can be extended by:
1. Adding `titlePunctuation?: TitlePunctuationConfig` to the page's config interface in CMS editor
2. Dropping `<TitlePunctuationEditor>` into the CMS page
3. Replacing hardcoded `<span className="text-primary">.</span>` with `<TitlePunctuation config={pageConfig?.titlePunctuation} />` on the public page
4. Adding the field to the public page's config type

Each page wire-up takes ~5 lines — documented in `impact-analysis.md` under "Follow-up work".

**Human verification:**
1. CMS → About Page → scroll to "Title Punctuation" section
2. Change character to `?` → preview updates live
3. Change color to Gold → preview updates
4. Enable italic + bold → preview updates
5. Save → reload public `/about` → hero title should show the styled `?` instead of red period
6. Set character to empty string → no punctuation should render
