# #5 — Beehiiv push hardening

## Context
Adapt `pushToBeehiiv` to the editorial issue: clean branded subject (never `[TEST]`), `preview_text` as subtitle, and graceful handling when `/posts` is unavailable so a quiet failure never crashes the cron.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** #0 (endpoint verified), #4 (HTML ready)
**Unblocks:** None

## Objective
Push a ready-to-send editorial draft to Beehiiv with correct subject/preview, failing safe and logged.

## Scope

### Build
- [ ] Update `pushToBeehiiv` (`newsletter-digest.ts`):
  - [ ] `title` = linted subject line; assert no `[TEST]` prefix in any path.
  - [ ] `subtitle` = `preview_text` (replaces the hardcoded "Top debates…" subtitle).
  - [ ] On non-2xx (incl. plan-gated `/posts`): set digest `status='failed'`, retain `html_body` + `infographic_url` for manual assembly, log status + body. Do not throw out of the cron path.
- [ ] Confirm `generateAndPushDigest` idempotency (`week_starting` unique) still holds with the new fields.

### Test
- [ ] Mocked Beehiiv 2xx → row `status='pushed'`, `beehiivPostId` set.
- [ ] Mocked non-2xx → `status='failed'`, no throw, HTML + infographic URL retained.
- [ ] Subject never contains `[TEST]`.

### Out of Scope
- HTML/template content (#4); subscriber sync (unchanged).

## Acceptance Criteria
- [ ] A clean draft (subject + preview + embedded infographic + buttons) is created in Beehiiv on the success path.
- [ ] Failure path is non-fatal, persisted, and logged with the real status/body.
- [ ] Cron (`lib/cron.ts`, Friday 9am Dubai) drives this unchanged.

## Technical Notes
- Current push at `newsletter-digest.ts:345`; subtitle hardcoded at `:362`.
- Use #0's findings to confirm the endpoint/fields; keep the fallback regardless.
