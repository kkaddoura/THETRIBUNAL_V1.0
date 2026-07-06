# #3 — Infographic: 1200×1500 size + signal-split template + render→R2

## Context
Each issue needs one branded infographic (The Split card) generated from the Signal debate. The Studio `satori → resvg → R2` pipeline is reusable, but there is no portrait size and the existing `poll-result-split` template is binary-only — so a new multi-option template is required.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** #1 (needs Signal data)
**De-risked by:** #0 (R2 embed proof)
**Unblocks:** #4

## Objective
Generate a 1200×1500 on-brand Split card from the Signal debate, upload to R2, and return its public URL on `DigestContent.infographic`.

## Scope

### Build
- [ ] **Size** (`artifacts/api-server/src/lib/press-kit/sizes.ts`): add `newsletter_signal: { width: 1200, height: 1500 }`.
- [ ] **New template** `artifacts/api-server/src/lib/press-kit/templates/signal-split.ts`:
  - [ ] Renders up to 4 options with text + percentage (not binary like `poll-result-split`).
  - [ ] Brand: black bg, `#DC143C` accent, cream text; uses `frame()` / `styleFor()` / `sizeScale()` from `styles.ts`.
  - [ ] Includes: Tribunal wordmark, label `THE WEEK'S SIGNAL`, category, question, ranked result breakdown, one-line takeaway, footer line `Vote privately. See the result publicly.`
- [ ] **Pipeline step** in `newsletter-digest.ts`: build the element from the Signal poll → `renderToPng(element, "newsletter_signal")` → upload via `uploadBuffer`/`uploadAsset` → set `infographic_url` + `infographic_r2_key` on content + persisted row.
- [ ] Compute alt text (used by #4) from the Signal question + label.

### Test
- [ ] Template renders 2, 3, and 4 options at 1200×1500 without overflow and yields a valid PNG buffer.
- [ ] Render-failure path returns no URL but does not throw (issue can still proceed with alt-text fallback).

### Out of Scope
- The other 3 card types (Contradiction / Ranking / One Number) — phase 2.
- Embedding into the email (#4).

## Acceptance Criteria
- [ ] A 1200×1500 PNG is produced from the Signal debate and uploaded to R2 with a public URL.
- [ ] The card shows wordmark, "THE WEEK'S SIGNAL", category, question, breakdown, takeaway, and the privacy footer line.
- [ ] In prod (R2 configured) the URL is public; locally without R2 the step degrades gracefully and logs.

## Technical Notes
- Render pipeline: `lib/press-kit/render.ts` (`renderToPng`, `uploadAsset`, `renderBatch`); fonts via `loadFonts`; tokens via `getBrandTokens`.
- Do NOT extend the binary `poll-result-split.ts`; it slices `options.slice(0,2)`. New template handles N options.
- R2 in-memory fallback yields `publicUrl: ""` — treat empty URL as "no embed" downstream.
