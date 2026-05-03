# TMH Pre-Launch Build Report

**Build session:** 2026-04-05
**Engineer:** Claude (AI pair programmer) with Soumik
**Scope:** Pre-launch hardening across 11 items — toggles, dummy votes, sharing, country views, chatbot character, CMS polish
**Target:** Public launch on 2026-04-06

## Status Overview

| Phase | Items | Status |
|------|-------|--------|
| Phase 1 — Launch Blockers | 6 | Complete — shipped & pushed |
| Phase 2 — Core Improvements | 3 | Complete — shipped & pushed |
| Phase 3 — Experience Enhancement | 1 (Chatbot Noor) | Complete — shipped & pushed |
| Follow-ups — Punctuation wire-up (4 pages) | 4 | Complete — shipped & pushed |
| Follow-ups — Content curation (100 per pillar) | 1 | Complete — applied on prod |

**All 11 items shipped + both follow-ups closed. 20 tests passing. Typecheck clean. DB curated to 100 approved items per pillar.**

## Documents in this folder

- `README.md` — this file, overview + status
- `phase-1-report.md` — Phase 1 items: what changed, files touched, behavior
- `phase-2-report.md` — Phase 2 items: what changed, files touched, behavior
- `phase-3-report.md` — Phase 3 (Noor chatbot overhaul)
- `qa-checklist.md` — Manual QA checklist for human testing (organized by feature)
- `code-review.md` — Self-review notes, trade-offs, follow-ups
- `impact-analysis.md` — Things that might be affected by these changes (blast radius)
- `deployment-steps.md` — Commands to run (migrations, seeds) before launch

## Commits (this session)

```
205a1f0  feat: content curation script with dry-run and apply modes
593042e  feat: wire colored punctuation into FAQ, Contact, Terms, Apply pages
674e235  docs: add Phase 3 report and update build report with Noor coverage
9d02dc3  feat: Noor chatbot overhaul with character, visual redesign, and smart linking
bfb8c54  docs: note migration + seed already executed on prod Supabase
f1f880e  docs: add build report for Phase 1 + Phase 2 with QA checklist
d655bc4  feat: configurable title punctuation (colored period) via CMS
3f05f3e  feat: professional share card generation with branded images
fd4ecbb  feat: IP consent banner, country view toggle, and geolocation API
5a16dbc  feat: add CMS feature toggles for Majlis, share gate, email capture, IP consent
47add20  feat: dummy votes system with CMS boost controls
b9fef2e  fix: deduplicate ideation category selector by pillar type
aa190ea  fix: replace all Telegram share references with Instagram
ae6edf7  feat: remove vote confirmation, allow instant vote changes on debates
1a7f622  fix: filter voices by editorialStatus=approved on all public API endpoints
```

All commits pushed to `main` branch on `origin` (github.com/Acharya-soumik/TMH-v1).

## Development Workflow Used

Every item followed this loop:
1. Read relevant files / explore with subagents
2. Write failing tests where appropriate (TDD — new Profiles test added)
3. Implement the change
4. Run full test suite + typecheck (all 16 tests passing across 2 suites)
5. Atomic git commit with descriptive message (no Claude co-author tag per preference)
6. Push to remote

Tests: Vitest + React Testing Library. Test suite runs in ~1.2s.
Typecheck: `tsc --build` across all 5 workspace projects, all green.
