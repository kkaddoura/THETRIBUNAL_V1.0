# #4 — Editorial email template (`buildDigestHtml`)

## Context
The current HTML renders a "Top debates" list. Replace it with the fixed editorial structure, real buttons, an embedded infographic, and email-client resilience (dark mode, mobile, blocked images).

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** #1 (content shape), #2 (copy), #3 (infographic URL)
**Unblocks:** #5, #6

## Objective
Render a premium, client-resilient HTML email matching the editorial structure, with no raw URLs and real buttons.

## Scope

### Build
- [ ] Rewrite `buildDigestHtml` (`newsletter-digest.ts`) to render:
  - [ ] **Header**: `THE TRIBUNAL` / `The region, on record.`
  - [ ] **Issue line**: `Issue {NNN} · Week of {date}` (zero-padded).
  - [ ] **Headline + Opening** (from copy).
  - [ ] **[Infographic]**: `<img>` of `infographic_url` with descriptive `alt`; if URL empty, render a styled text fallback block instead.
  - [ ] **The Week's Signal**: category, question, editorial read, result snapshot with label, button **View the debate**.
  - [ ] **The Split**: question, what the split suggests, top result, button **Cast your vote**.
  - [ ] **One to Watch**: question, why it matters, button **Vote now**.
  - [ ] **What should we ask next?**: body + button **Send a question**.
  - [ ] **Footer**: `Vote privately. See the result publicly.` / `The Tribunal — by The Middle East Hustle` + existing `{{unsubscribe_link}}` placeholder.
- [ ] **Buttons**: bulletproof table/VML-based anchors (Outlook-safe), brand colors, no visible raw URLs; all `href`s UTM-tagged.
- [ ] **Dark mode**: dark-on-dark palette must not depend on client inversion; set `color-scheme`/`supported-color-schemes`.
- [ ] **Mobile**: single-column, fluid widths, ≥16px tap targets.
- [ ] Keep `escapeHtml` on all dynamic + AI strings.

### Test
- [ ] Snapshot: no raw `http(s)://` text nodes (only inside `href`).
- [ ] Every section CTA is a button; section order matches the structure.
- [ ] Infographic alt text present; empty-URL path renders the fallback block.
- [ ] Unsubscribe placeholder present.

### Out of Scope
- Beehiiv push (#5); CMS preview (#6).

## Acceptance Criteria
- [ ] Rendered HTML follows Header → Issue → Headline → Opening → Infographic → Signal → Split → One to Watch → Ask Next → Footer.
- [ ] No raw URLs visible; all CTAs are buttons with UTM-tagged links.
- [ ] Legible in dark mode and on mobile; graceful when images are blocked.

## Technical Notes
- Current template + UTM pattern at `newsletter-digest.ts:249`. Brand colors: bg `#0A0A0A`, accent `#DC143C`, text `#F2EDE4`.
- Link targets: `/debates/:id`, `/predictions/:id` with existing UTM string.
- Use table-based layout (email-safe) — no flex/grid; inline styles only.
