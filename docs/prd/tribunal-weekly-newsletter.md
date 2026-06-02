# PRD: Tribunal Weekly Editorial Newsletter (MVP)

## Status
Draft

## Problem Statement
The Tribunal's weekly newsletter currently reads like an automated database export. The existing pipeline (`artifacts/api-server/src/services/newsletter-digest.ts`) selects the top 3 polls by raw vote count, the top 2 predictions resolving in 7 days, and one "featured voice," then renders them under a generic **"Top debates"** header with styled links and a subject-line fallback of *"This week on The Tribunal."* There is no editorial point of view, no visual asset, no anti-overclaiming discipline, and no sense that a human editor shaped the issue.

This is not acceptable for launch. The Tribunal's positioning is *"private votes, public results, one clear signal from the week."* A database dump undercuts that brand and gives subscribers no reason to open issue #2.

**Who is affected:** every subscriber (first impression at launch) and the founder, whose brand credibility rides on the newsletter feeling like a premium weekly brief rather than a system notification.

**Cost of inaction:** weak launch open/retention rates, a newsletter that contradicts the brand's "signal, not noise" promise, and copy that risks overclaiming on self-selected opinion data (e.g. "the region has spoken") — a credibility and arguably legal/ethical liability.

## Solution
Upgrade the existing digest pipeline in place — **not a rewrite of the newsletter system, and not a site redesign** — so it produces a structured editorial issue instead of a list.

The platform will:
1. **Select content editorially**: one "Week's Signal" debate (Editor's Pick flag first, else the most-divided debate above a vote floor), one "Split" debate, and one "One to Watch" item (a resolving prediction if available, else a third debate).
2. **Generate one branded infographic** (The Split card) from the Signal debate using the existing Studio `satori → resvg → R2` pipeline, embedded in the email as a hosted PNG with alt text.
3. **Generate editorial copy** (subject, preview text, intro, per-section takeaways) via the existing AI integration, constrained by an explicit anti-overclaiming prompt **and** a deterministic banned-phrase linter that forces a safe fallback before anything reaches the preview.
4. **Render a premium HTML email** with the fixed editorial structure, real buttons (no raw URLs), dark-mode/mobile safety, and an image-blocked fallback.
5. **Push a ready-to-send draft to Beehiiv** via `POST /posts` (`content_html`); the founder reviews in Beehiiv and clicks Send.

Selection and copy are **fully automatic for the MVP** — no new CMS editorial controls. The founder's only steering lever is the existing **Editor's Pick** toggle on polls; the final gate is the Beehiiv preview before send.

## Goals & Non-Goals

### Goals
- Replace the "Top debates" dump with the fixed editorial structure: **Header → Issue line → Headline → Opening → [Infographic] → The Week's Signal → The Split → One to Watch → What should we ask next? → Footer.**
- Auto-generate and embed exactly **one infographic** (The Split card, 1200×1500, on-brand) per issue from the Signal debate.
- Guarantee **zero overclaiming**: no banned phrase can survive to the preview; every vote reference is hedged and carries an honest vote-count label.
- Ship **real buttons** ("View the debate", "Cast your vote", "Vote now", "Send a question"), no visible raw URLs, all links UTM-tagged.
- Produce a Beehiiv draft with a clean branded subject (no `[TEST]`, never "This week on The Tribunal"), `preview_text`, and dark-mode + mobile-friendly layout.
- Document all Beehiiv dashboard settings the platform cannot control (From name, reply-to, author display, footer physical address).

### Non-Goals
- **Full CMS editorial picker** (hand-pick main/supporting/prediction, per-section takeaways, infographic-type and label selectors). *Phase 2 — MVP is auto-only with Editor's Pick as the lever.*
- **The other three infographic types** (Contradiction, Ranking, One Number). *Phase 2 — MVP ships The Split card only.*
- **Voice of the week.** *Dropped from the editorial structure entirely.*
- **Changes to subscriber sync / email capture / unsubscribe.** Existing `syncToBeehiiv` and RFC-8058 one-click unsubscribe stay as-is.
- **Faking the footer mailing address in code.** It is a Beehiiv compliance setting; documented, not hardcoded.
- **Site/UI redesign** beyond the CMS digest-preview page.

## User Stories

**Story 1: Subscriber opens the weekly issue**
- **Given** a subscriber receives the Friday issue
- **When** they open it
- **Then** they see a branded header, an issue line ("Issue 001 · Week of [date]"), an editorial opening, one branded infographic, and three editorial sections (Signal / Split / One to Watch) ending in a "Send a question" CTA — with buttons, not raw links.

**Story 2: Founder reviews before send**
- **Given** the weekly draft has been pushed (by cron or manually)
- **When** the founder opens it in Beehiiv
- **Then** the draft is fully assembled (copy + embedded infographic + buttons), the subject is branded with no `[TEST]` prefix, and they can review and click Send without editing.

**Story 3: Founder steers the Signal**
- **Given** the founder wants a specific debate to be the week's Signal
- **When** they toggle `isEditorsPick` on that poll in the existing poll CMS before the issue is generated
- **Then** that poll becomes the Week's Signal (and the source of the infographic); otherwise the most-divided debate above the vote floor is chosen automatically.

**Story 4: Low-volume week is labeled honestly**
- **Given** the Signal debate has fewer than 50 votes
- **When** the issue renders
- **Then** the result snapshot is labeled **"Early signal · N votes"** (showing the real N), and the copy uses hedged language ("among current voters", "the leading answer so far") — never "the region has spoken" or any banned phrase.

**Story 5: AI emits a banned phrase**
- **Given** the AI generation produces copy containing a blocklisted phrase (e.g. "poll proves")
- **When** the deterministic linter scans it
- **Then** the offending copy is replaced by a safe template fallback before it is stored or shown in preview, and the event is logged.

**Story 6: A quiet prediction week**
- **Given** no prediction resolves within the window
- **When** the issue is assembled
- **Then** "One to Watch" falls back to a third debate so the issue never drops a section or breaks.

**Story 7: Images blocked / dark mode**
- **Given** a subscriber's client blocks images or forces dark mode
- **When** they view the issue
- **Then** the infographic shows descriptive alt text in its place, and all text/buttons remain legible against the dark background.

**Story 8: Beehiiv `/posts` unavailable**
- **Given** the publication's plan does not have `POST /posts` enabled
- **When** the push runs
- **Then** the digest is still generated, stored (status `failed` or `generated`), and the HTML + infographic URL are available for manual assembly, with a clear logged reason — the pipeline does not crash.

## Technical Design

### Module Map
| Module | File(s) | Change |
|--------|---------|--------|
| DB schema | `lib/db/src/schema/newsletter-digests.ts` | **Modified** — add columns for infographic URL/key, preview text, structured section assignments, signal label |
| Selection engine | `artifacts/api-server/src/services/newsletter-digest.ts` (`selectTopContent`) | **Modified** — editorial Signal/Split/OneToWatch selection, Editor's Pick → most-divided, vote-label thresholds, drop voice |
| AI generation | same service (`generateAiContent`) | **Modified** — new editorial prompt (subject/preview/intro/per-section takeaways) |
| Copy linter | new `artifacts/api-server/src/services/newsletter-lint.ts` | **New** — deterministic banned-phrase blocklist + safe-fallback rewrite |
| Infographic size | `artifacts/api-server/src/lib/press-kit/sizes.ts` | **Modified** — add `newsletter_signal: 1200×1500` |
| Infographic template | new `artifacts/api-server/src/lib/press-kit/templates/signal-split.ts` | **New** — multi-option (up to 4) Split card; existing `poll-result-split` is binary-only and not reusable here |
| Infographic step | digest service | **Modified** — render via `renderToPng` → `uploadBuffer`/`uploadAsset` → public URL |
| Email template | `buildDigestHtml` in digest service | **Modified** — editorial sections, real buttons, alt text, dark-mode/mobile, image-blocked fallback |
| Beehiiv push | `pushToBeehiiv` in digest service | **Modified** — verify `/posts`, `title` without `[TEST]`, `subtitle = preview_text`, graceful fallback |
| CMS preview | `artifacts/cms/src/pages/newsletter-digest.tsx` | **Modified** — render new structure + infographic in editorial preview |
| Docs | new `docs/beehiiv-setup.md` | **New** — From name, reply-to, author display, footer address; R2-required-in-prod note |

Unchanged: `routes/newsletter.ts` (subscribe/unsubscribe), `routes/digest.ts` (preview/push/list endpoints — payloads adapt to new shape), `lib/cron.ts` (Friday 9am Dubai trigger).

### Data Model Changes
Extend `newsletter_digests` (additive, nullable — safe migration):

| Column | Type | Purpose |
|--------|------|---------|
| `preview_text` | `text` | Beehiiv `subtitle` / inbox preview |
| `signal_poll_id` | `integer` | The Week's Signal debate |
| `split_poll_id` | `integer` | The Split debate |
| `one_to_watch_kind` | `text` (`prediction` \| `poll`) | Which entity fills One to Watch |
| `one_to_watch_id` | `integer` | Its id |
| `signal_label` | `text` | `Early signal` \| `Current split` \| `Live debate` |
| `infographic_url` | `text` | Public R2 URL embedded in the email |
| `infographic_r2_key` | `text` | R2 key for audit/regeneration |
| `section_takeaways` | `jsonb` | `{ signal, split, oneToWatch }` editorial reads |

Existing columns (`selected_poll_ids`, `intro_text`, `subject_line`, `html_body`, `status`, idempotency on `week_starting`) are retained.

### API Changes
No new public endpoints. CMS-protected routes in `routes/digest.ts` keep their paths; response shapes change:
- `POST /api/cms/digest/preview-this-week` → returns the new editorial `content` object (sections, labels, takeaways, `infographicUrl`) + rendered `html`.
- `POST /api/cms/digest/push-to-beehiiv` → unchanged contract; pushes the new draft.
- `GET /api/cms/digest` → list rows include `signalPollId`, `signalLabel`, `infographicUrl`.

`DigestContent` interface is restructured from `{ topPolls[], resolvingPredictions[], featuredVoice }` to `{ issueNumber, weekRange, signal, split, oneToWatch, infographic, copy }`.

### Dependencies
- **Existing & reused:** `satori`, `@resvg/resvg-js`, R2 (`@aws-sdk/client-s3`, `uploadBuffer`, `R2_PUBLIC_URL`), `loadFonts`, brand tokens (`getBrandTokens`), the AI integration (`AI_INTEGRATIONS_OPENAI_*`), Drizzle, `node-cron`.
- **External:** Beehiiv `POST /v2/publications/{id}/posts` (flagged enterprise-beta — must be verified against the live account during build).
- **Hard prod requirement:** R2 must be configured in production. Locally, R2 falls back to an in-memory store with **no public URL**; an email cannot embed a `mem:*` asset, so the infographic requires real R2 in any environment that pushes to Beehiiv.

## Implementation Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delivery mechanism | Platform pushes full HTML draft via Beehiiv `POST /posts`; founder sends | User confirmed; keeps founder as final gate while platform does the assembly |
| Editorial selection | Fully automatic; Editor's Pick → most-divided fallback | MVP scope; avoids building a CMS picker now while still giving the founder one lever |
| Signal vs. highest-votes | Most-divided (smallest top-option lead) above a vote floor | Brief: "the strongest debate, not the highest votes"; a landslide is boring |
| Infographic type | The Split card only | MVP scope; other 3 types are phase 2 |
| Infographic template | New multi-option `signal-split` template | Existing `poll-result-split` renders only the top 2 options; Split card needs up to 4 |
| Infographic size | New `newsletter_signal` 1200×1500 | No portrait size exists in `SIZES`; reusable for social later |
| Overclaiming control | AI prompt rules **+** deterministic post-lint with safe fallback | No human edits the words; prompt-only could leak a banned phrase to a real send |
| Vote labels | Threshold-based (`<50` Early signal; `50–150` Current split if divided else Live debate; `>150` Live debate); always show real N | Deterministic, honest, no manual input needed |
| Sender/compliance | Documented as Beehiiv dashboard settings | From name, reply-to, author, and the legally-required footer address are not platform-controllable and must not be faked in code |
| Voice of the week | Dropped | Not part of the new editorial structure |

## Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Fewer than 2–3 eligible debates in the window | Render available sections; never emit an empty/placeholder section. Minimum: Signal + Ask Next. Log the thin week. |
| No prediction resolving | One to Watch falls back to a third debate |
| Signal debate below vote floor | Label "Early signal · N votes"; still render; infographic still generated |
| AI returns banned phrase | Linter replaces with safe template fallback before store/preview; log the hit |
| AI integration unavailable | Use deterministic template copy (existing fallback pattern), still lint it |
| Infographic render fails | Email renders with alt-text block in place of the image; digest still pushes; log the render error (mirrors `renderBatch` per-item failure handling) |
| R2 not configured in prod | Skip embed, log a hard warning; do not push an email referencing a non-public asset |
| Beehiiv `/posts` not enabled / non-2xx | Store digest with `status='failed'`, keep HTML + infographic URL for manual use, log status + body |
| Duplicate week (idempotency) | Existing `week_starting` unique guard prevents double-push; failed rows may be regenerated |
| Images blocked by client | Alt text shown; layout and buttons remain legible |
| Dark mode | Already dark-on-dark brand palette; ensure buttons/text meet contrast and don't rely on client color inversion |

## Security Considerations
- CMS digest routes remain behind `requireCmsAuth` (`x-cms-token` → `cms_sessions`); no change.
- All dynamic strings (questions, options, categories, AI copy) continue to pass through `escapeHtml` before HTML interpolation — XSS guard on author-influenced and AI-generated content.
- The banned-phrase linter is a **content-integrity / brand-safety** control, not a security control, but it runs server-side before any external send.
- Beehiiv API key and publication id remain server-only env vars; never exposed to the CMS client.
- Unsubscribe tokens (HMAC-signed) and one-click unsubscribe are untouched.
- No new PII surface; emails are not logged in full (existing `email.substring(0,3)+"***"` masking pattern preserved).

## Testing Strategy
- **Unit (vitest, existing setup):**
  - Selection engine: Editor's Pick precedence; most-divided tie-breaking; vote-floor exclusion; One-to-Watch prediction→debate fallback; voice fully removed.
  - Vote-label thresholds at boundaries (49/50/150/151; divided vs. dominant).
  - **Linter: every banned phrase is caught and rewritten**; clean copy passes untouched; case/whitespace variants caught.
  - Subject-line guard: never `[TEST]`, never "This week on The Tribunal".
- **Rendering:**
  - `signal-split` template renders 2/3/4 options at 1200×1500 without overflow; produces a valid PNG buffer.
  - `buildDigestHtml` snapshot: no raw `http(s)://` text nodes (only in `href`); every CTA is a button; alt text present; unsubscribe placeholder present.
- **Integration:**
  - End-to-end `selectTopContent → buildDigestHtml` on seeded data produces the full editorial structure.
  - `pushToBeehiiv` against a mocked Beehiiv: success path sets `pushed`; non-2xx sets `failed` without throwing.
- **Manual QA** — the brief's 15-point checklist against a real Beehiiv test draft (clean sender, no `[TEST]`, no raw URLs, one infographic embedded, buttons work, hedged copy, working debate links, mobile + dark-mode, alt text, image-blocked fallback, correct/explained footer).

## Rollout Plan
1. **Schema migration** — additive nullable columns; no backfill required.
2. **Verify Beehiiv `/posts`** against the live account early (de-risks the whole feature). If unavailable, ship the generate-and-store path + manual-assembly fallback and revisit delivery.
3. **Configure R2 in production** (hard requirement for the embedded infographic).
4. Build behind the existing `DIGEST_CRON_ENABLED` flag — cron stays off until a manual preview/push passes QA.
5. **Manual dry run**: generate via CMS "Preview this week", inspect, push one draft to Beehiiv, run the 15-point QA against it.
6. Enable cron (Friday 9am Asia/Dubai) once QA passes.
7. **Rollback:** the old `buildDigestHtml`/`selectTopContent` behavior is replaced, not deleted in history; cron flag off + revert commit restores the prior pipeline. No data loss (additive schema).
8. **Beehiiv dashboard tasks** (documented, owner = founder): set From name "The Tribunal", reply-to inbox, author display, and the real footer address when legal is finalized.

## Open Questions
*(None blocking. Placeholders below are intentional and swappable in the Beehiiv dashboard — no code change needed to update them.)*
- **Reply-to (placeholder):** `hello@themiddleeasthustle.com` — swap to the real Tribunal inbox in Beehiiv when ready.
- **Footer mailing address (placeholder):** documented placeholder in `docs/beehiiv-setup.md`; replace with the real registered address in Beehiiv once legal setup is finalized. Compliance-required; never faked in code.
