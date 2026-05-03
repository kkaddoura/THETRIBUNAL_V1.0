# Filter Sidebar — Constant UI

Extract the Debates page sidebar pattern into a shared `FilterSidebar` component, then mount on Predictions and Pulse so all three pages have identical filter UI.

- [x] New `components/layout/FilterSidebar.tsx` — sticky-left shell with optional `search`, `sort`, and `categories` slots; encapsulates the "View More" expand state
- [x] `polls.tsx` — replaced ~125 lines of inline sidebar JSX with the component (passes search + sort tabs + categories)
- [x] `predictions.tsx` — removed header search + horizontal pill bar; wrapped content in `flex flex-col lg:flex-row gap-12`; mounted FilterSidebar with search + categories
- [x] `mena-pulse.tsx` — removed header search + inline `CategoryFilter` (function deleted); wrapped trends grid in flex layout; mounted FilterSidebar with search + categories
- [x] Typecheck `@workspace/tmh-platform` — clean
- [x] Tests — Chatbot test failures are pre-existing on `main` (verified via stash); not regressions

# Voices Feature Toggle

Mirror the existing Majlis toggle pattern for Voices. Default behavior: ON (preserve current state).

## Plan

- [x] Add `voices: { enabled: boolean }` to `FeatureToggles` interface in `artifacts/cms/src/pages/page-site-settings.tsx` (default `?? true`)
- [x] Add Voices toggle UI block in the Feature Toggles tab
- [x] Add `voices?: { enabled: boolean }` to `featureToggles` type in `artifacts/tmh-platform/src/hooks/use-cms-data.ts`
- [x] Gate `/voices` and `/voices/:id` routes in `App.tsx` (redirect to `/` when off)
- [x] Filter Voices link from `defaultLinks` and CMS-defined `cmsLinks` in `Navbar.tsx`
- [x] Conditionally render the `/* THE VOICES */` section in `home.tsx`
- [x] Filter Voices cell from the homepage stat-link grid in `home.tsx`
- [x] Filter `/voices` links in `Footer.tsx` (default NAV + CMS NAV; also added Majlis filter)
- [x] Hide `/voices` link in `join.tsx` desktop navbar
- [x] Hide `/voices` link in `not-found.tsx` explore section
- [x] Filter Voices pillar + "Meet The Voices" CTA in `about.tsx` (also added Majlis pillar filter)
- [x] Drop "voices" from Chatbot greeting topics when toggle is off
- [x] Typecheck `@workspace/tmh-platform` and `@workspace/cms` — both clean

## Review

Voices toggle now mirrors the Majlis pattern at every reference point. Default is `true` (preserves existing behavior).

When toggled OFF in CMS → Site Settings → Feature Toggles:
- `/voices` and `/voices/:id` redirect to `/`
- `/profiles` → `/profiles/:id` redirects also fall through to `/`
- Removed from: navbar, footer, homepage stat grid, homepage Voices section, `/about` pillars + CTA, `/join` desktop nav, `/404` explore links
- Chatbot greeting drops "voices" from its topic list
- CMS-defined nav/footer links starting with `/voices` are filtered out

Ancillary: `Footer.tsx` and `about.tsx` also got Majlis filtering for consistency (the CMS-defined Majlis pillar/footer link wasn't being filtered before — same toggle, same pattern).

The `/apply` route ("Join The Voices" CTA) was intentionally **not** gated — applications go to the CMS for editorial review and don't depend on the public Voices listing being visible.

## Notes

- Default `voicesEnabled` to `true` (preserves existing behavior on first deploy when `featureToggles.voices` is undefined)
- The Majlis toggle defaults `false`; Voices defaults `true` — different policies are intentional
