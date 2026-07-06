# #6 — CMS preview update

## Context
The CMS digest page previews the old `{ topPolls, resolvingPredictions, featuredVoice }` shape. Update it to render the new editorial structure and show the generated infographic, so the founder can review before pushing.

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Blocked by:** #4
**Unblocks:** None

## Objective
Show an accurate editorial preview (sections + infographic) of this week's issue in the CMS before push.

## Scope

### Build
- [ ] Update `artifacts/cms/src/pages/newsletter-digest.tsx`:
  - [ ] Replace the `PreviewResponse` interface with the new `DigestContent` shape (signal / split / oneToWatch / copy / infographic; remove featuredVoice).
  - [ ] Editorial preview pane: subject, preview text, issue line, the three sections with labels + takeaways, and the **infographic image**.
  - [ ] Keep the existing `<iframe srcDoc={html}>` email render and the Preview / Push buttons.
  - [ ] Past-digests table: surface `signalLabel` and a link/thumbnail for `infographicUrl`.
- [ ] Adapt `routes/digest.ts` response mapping to the new fields (no path/auth changes).

### Test
- [ ] Preview renders the three editorial sections and the infographic from a mocked content payload.
- [ ] No references to the removed `featuredVoice`/`topPolls` fields remain (typecheck passes).

### Out of Scope
- New editorial CMS controls/overrides — phase 2; this is preview-only.

## Acceptance Criteria
- [ ] Founder sees subject, preview text, the three sections, and the infographic before pushing.
- [ ] Iframe email render and push flow still work.
- [ ] Past-digests list reflects the new fields.

## Technical Notes
- Page logic at `newsletter-digest.tsx:48`; uses `api.previewDigest()` / `api.pushDigest()` / `api.listDigests()` in `artifacts/cms/src/lib/api.ts`.
- CMS routes stay behind `requireCmsAuth` (`routes/digest.ts:19`).
