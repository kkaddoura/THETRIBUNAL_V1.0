# #1 — Editorial selection + schema migration

## Context
The current `selectTopContent` produces a `{ topPolls[], resolvingPredictions[], featuredVoice }` dump. Replace it with the editorial structure (Signal / Split / One to Watch) and persist the structured choices. This is the data spine every other slice builds on.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** None
**Unblocks:** #2, #3, #4

## Objective
Produce a restructured `DigestContent` with an editorially-selected Signal, Split, and One-to-Watch, plus honest vote labels, and persist the new fields.

## Scope

### Build
- [ ] **Schema** (`lib/db/src/schema/newsletter-digests.ts`): add nullable columns `preview_text`, `signal_poll_id`, `split_poll_id`, `one_to_watch_kind`, `one_to_watch_id`, `signal_label`, `infographic_url`, `infographic_r2_key`, `section_takeaways` (jsonb). Generate/apply the additive migration per existing Drizzle workflow.
- [ ] **Selection** (`newsletter-digest.ts` `selectTopContent`): rewrite to
  - [ ] **Signal** = poll with `isEditorsPick = true` (most recent) → else the **most-divided** debate (smallest gap between top two option percentages) with `totalVotes >= VOTE_FLOOR`.
  - [ ] **Split** = most-divided *remaining* debate (excluding the Signal).
  - [ ] **One to Watch** = a prediction resolving within the window if one exists, else a third debate. Set `one_to_watch_kind` accordingly.
  - [ ] **Vote label** helper: `<50` → `Early signal`; `50–150` → `Current split` if divided (no option >45%) else `Live debate`; `>150` → `Live debate`. Always carries the real count.
  - [ ] **Remove** the featured-voice selection entirely.
- [ ] Restructure the `DigestContent` interface to `{ issueNumber, weekRange, signal, split, oneToWatch, copy, infographic }` (copy/infographic filled by #2/#3; provide typed placeholders).
- [ ] Compute `issueNumber` (count of prior non-failed digests + 1) and `weekRange` from the existing Friday-anchored `weekStartingFor`.

### Test
- [ ] Editor's Pick precedence over most-divided.
- [ ] Most-divided tie-breaking + vote-floor exclusion.
- [ ] One-to-Watch prediction→debate fallback on a no-prediction week.
- [ ] Vote-label thresholds at boundaries (49/50/150/151; divided vs. dominant >45%).
- [ ] Featured voice no longer present in output.

### Out of Scope
- AI copy and linter (#2), infographic (#3), HTML rendering (#4), Beehiiv push changes (#5).

## Acceptance Criteria
- [ ] `selectTopContent` returns the new structured shape with a Signal, a Split (distinct from Signal), and a One-to-Watch (or gracefully fewer sections on a thin week).
- [ ] Each section carries the correct threshold-based label and real vote count.
- [ ] Migration applies cleanly; `generateAndPushDigest` persists the new columns.

## Technical Notes
- Existing vote math: option `voteCount + dummyVoteCount`; total per poll already computed at `newsletter-digest.ts:83`.
- Predictions: `resolvesAt` is text, filtered/sorted in JS (`:106`). Keep that approach.
- `VOTE_FLOOR` constant — start at a small sane value (e.g. 10) and document it.
- Keep additive/nullable columns so the migration is reversible and needs no backfill.
