# #2 — Copy linter + AI editorial generation

## Context
No human edits the newsletter words, so the auto-generated copy must be both editorial and incapable of overclaiming. This slice adds a deterministic banned-phrase linter and rewrites the AI generation to produce subject / preview / intro / per-section takeaways under the brand's hedged-language rules.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** #1
**Unblocks:** #4

## Objective
Generate safe, hedged editorial copy for every issue, with a code-level guarantee that no banned phrase reaches the preview.

## Scope

### Build
- [ ] **New** `artifacts/api-server/src/services/newsletter-lint.ts`:
  - [ ] Blocklist (case/whitespace-insensitive): "the region has spoken", "the majority of the region believes", "poll proves", "people in the arab world think", "definitive result", "scientific result", and the banned subject "this week on the tribunal" — plus a small extensible list.
  - [ ] `lintCopy(text)` → `{ clean: boolean, hits: string[] }`; `sanitize(field, text, fallback)` → returns a safe template fallback when a hit is found, and logs the hit.
- [ ] **Rewrite** `generateAiContent` (`newsletter-digest.ts`):
  - [ ] New system prompt enforcing hedged phrasing ("among current voters", "the leading answer so far", "the current split shows") and the explicit ban list; never invent numbers.
  - [ ] Produce `{ subjectLine, previewText, introText, sectionTakeaways: { signal, split, oneToWatch } }`.
  - [ ] Run every returned field through the linter; any hit → safe fallback before return.
  - [ ] Keep the existing deterministic fallback when `AI_INTEGRATIONS_OPENAI_*` is unset — and lint that too.
  - [ ] Subject guard: never emit `[TEST]` or the banned subject.

### Test
- [ ] **Every** banned phrase is caught and rewritten; clean copy passes untouched.
- [ ] Case and extra-whitespace variants are caught.
- [ ] Subject-line guard rejects `[TEST]` and "This week on The Tribunal".
- [ ] AI-unavailable path returns linted deterministic copy.

### Out of Scope
- Rendering copy into HTML (#4); selection logic (#1).

## Acceptance Criteria
- [ ] No issue can be produced containing a blocklisted phrase in subject, preview, intro, or any takeaway.
- [ ] Generated copy uses hedged language and references the real vote labels from #1.
- [ ] Lint hits are logged for observability.

## Technical Notes
- Existing AI call: `${AI_INTEGRATIONS_OPENAI_BASE_URL}/chat/completions`, model `claude-sonnet-4-6`, `response_format: json_object` (`newsletter-digest.ts:202`). Reuse it.
- Linter is server-side and runs before persistence/preview — it is a brand-safety gate, not security.
