# #0 — Tracer: Beehiiv `/posts` + R2 image embed E2E

## Context
The entire delivery architecture rests on two unverified assumptions: that the publication's Beehiiv plan has `POST /posts` enabled (flagged enterprise-beta in `.env.production.example`), and that an R2-hosted PNG actually renders when embedded in a Beehiiv draft. Prove both end-to-end before building any editorial machinery.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** None
**Unblocks:** #3 (infographic embed), #5 (push hardening)

## Objective
Push a minimal draft to Beehiiv containing one R2-hosted test image and confirm it appears as a draft with the image rendering.

## Scope

### Build
- [ ] One-off verification script `scripts/src/verify-beehiiv-tracer.ts` (mirrors existing `scripts/src/*` patterns) that:
  - [ ] Uploads a tiny test PNG to R2 via `uploadBuffer` and resolves its `R2_PUBLIC_URL`.
  - [ ] POSTs a trivial `content_html` (one `<img>` + one styled button) to `https://api.beehiiv.com/v2/publications/{id}/posts` with `status: "draft"`.
  - [ ] Logs the response status, body, and resulting post id.
- [ ] Record the outcome (works / 403 / 404 / plan-gated) in the PRD's Rollout section or a note in `tasks/newsletter/README.md`.

### Test
- [ ] Manual: confirm the draft exists in the Beehiiv dashboard and the R2 image renders (not a broken-image icon).

### Out of Scope
- Editorial content, real templates, selection logic, linter — this is throwaway proof-of-flow.

## Acceptance Criteria
- [ ] A draft post is created in Beehiiv via the API (or the failure mode is documented with status/body).
- [ ] The R2-hosted image is confirmed publicly reachable and rendering inside the draft.
- [ ] A clear go/no-go note on `/posts` availability is recorded for #5.

## Technical Notes
- Beehiiv call shape already exists in `pushToBeehiiv` (`newsletter-digest.ts:345`). R2 upload in `utils/r2.ts` (`uploadBuffer`, `R2_PUBLIC_URL`, `isR2Available`).
- R2 must be configured (real bucket) for this test — the in-memory fallback yields no public URL.
- Keep this script out of the cron path; it is a manual de-risking tool.
