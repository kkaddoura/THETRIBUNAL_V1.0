# Kanban — Tribunal Weekly Editorial Newsletter (MVP)

**PRD:** `docs/prd/tribunal-weekly-newsletter.md`
**Repo has no GitHub remote** — these markdown files are the issue board. Move items by editing the Status table below.

## Dependency Graph

```
#0 Tracer: Beehiiv /posts + R2 image embed E2E    (no blockers) ─┐
#1 Editorial selection + schema migration         (no blockers) ─┤─ parallel start
#7 Docs: Beehiiv setup + R2-required note          (no blockers) ─┘

#2 Copy linter + AI editorial generation     (blocked by #1)
#3 Infographic: size + signal-split + render  (blocked by #1; de-risked by #0)
#4 Editorial email template (buildDigestHtml) (blocked by #1, #2, #3)
#5 Beehiiv push hardening                     (blocked by #0, #4)
#6 CMS preview update                         (blocked by #4)
```

## Status Board

| # | Slice | Blocked by | Unblocks | Status |
|---|-------|-----------|----------|--------|
| 0 | [Tracer: Beehiiv /posts + R2 embed E2E](00-tracer-beehiiv-r2.md) | — | 3, 5 | Todo |
| 1 | [Editorial selection + schema](01-selection-schema.md) | — | 2, 3, 4 | Todo |
| 2 | [Copy linter + AI editorial generation](02-lint-ai-copy.md) | 1 | 4 | Todo |
| 3 | [Infographic: size + signal-split template](03-infographic-split-card.md) | 1 | 4 | Todo |
| 4 | [Editorial email template](04-email-template.md) | 1, 2, 3 | 5, 6 | Todo |
| 5 | [Beehiiv push hardening](05-beehiiv-push.md) | 0, 4 | — | Todo |
| 6 | [CMS preview update](06-cms-preview.md) | 4 | — | Todo |
| 7 | [Docs: Beehiiv setup + R2 note](07-docs-beehiiv-setup.md) | — | — | Todo |

## Recommended Execution Order
1. **Parallel wave A:** #0, #1, #7 (no blockers).
2. **Parallel wave B:** #2, #3 (after #1).
3. #4 (after #1, #2, #3).
4. **Parallel wave C:** #5 (after #0, #4), #6 (after #4).

## Ralph Loop
Pick any `Todo` whose "Blocked by" items are all `Done` → implement via `/tdd` → run tests → mark `Done` → repeat. Independent slices can run concurrently.
