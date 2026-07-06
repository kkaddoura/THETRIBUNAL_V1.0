# #7 — Docs: Beehiiv setup + R2-required note

## Context
Several brief requirements (From name, reply-to, author display, footer physical address) are Beehiiv **dashboard** settings the platform cannot and should not control in code. Document exactly what to set, plus the hard production requirement that R2 must be configured for the embedded infographic.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** None
**Unblocks:** None

## Objective
A single setup doc the founder can follow to make the newsletter compliant and on-brand in Beehiiv.

## Scope

### Build
- [ ] New `docs/beehiiv-setup.md` covering:
  - [ ] **From name** → `The Tribunal`.
  - [ ] **Reply-to** → placeholder `hello@themiddleeasthustle.com` (swap to the real Tribunal inbox later — no code change).
  - [ ] **Author display** → how to change `soumik acharjee` to `The Tribunal` (account/publication setting).
  - [ ] **Footer physical address** → legally required (CAN-SPAM etc.); the NY value is Beehiiv's default placeholder. Use a documented placeholder now; replace with the real registered address once legal is finalized. Never faked in code.
  - [ ] **No `[TEST]` in production subjects** — note that the platform guarantees this; warn against manual test sends leaking the prefix.
  - [ ] **R2 required in production** — the infographic embeds a public R2 URL; without R2 the image won't render. Reference `R2_*` env vars in `.env.production.example`.
  - [ ] **`/posts` API** — note the enterprise-beta flag and the #0 verification outcome.

### Test
- [ ] N/A (docs). Peer-read for accuracy against the PRD.

### Out of Scope
- Any code changes.

## Acceptance Criteria
- [ ] `docs/beehiiv-setup.md` exists and covers From name, reply-to, author, footer address, `[TEST]` guarantee, R2 requirement, and `/posts` status.
- [ ] Placeholders are clearly marked as swappable in the dashboard.

## Technical Notes
- Env reference: `.env.production.example` (`BEEHIIV_*`, `R2_*`, `APP_URL`). App domain: `themiddleeasthustle.com`.
