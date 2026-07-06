# Social Studio — Compose v2 Spec (2026-05-14)

**Status:** Awaiting user green-light before implementation.

## Why

Today's Studio conflates *content atom* and *layout* into one "post type"
(`item-prediction`, `carousel-debate`, `carousel-pulse-trio`, etc.). This:

1. Hard-codes which atom type the source picker pulls from, so the picker is a
   flat "everything" combobox with no segregation by type.
2. Blocks heterogeneous carousels — you can't ship a 3-slide kit that mixes one
   prediction + one voice + one pulse, only one of `carousel-debate` /
   `carousel-pulse-trio` / `carousel-pillars`.
3. Forces the AI image flow to be Voice-only with bespoke I1/I2/I3 chips, even
   though every visual atom type (prediction, debate, voice, pulse, about-pillar,
   about-founder) could benefit from a brand-styled hero image.

## What we're building

Decouple **Layout** (presentation shape) from **Slots** (an ordered list of
content atoms). Add a per-kit **AI image** toggle that's gated to atom types
where AI imagery makes sense.

### Data model

```ts
type AtomType =
  | "debate" | "prediction" | "voice" | "pulse"
  | "about-founder" | "about-pillar" | "about-belief" | "about-region"
  | "manifesto"
type Layout =
  | "single"        // 1 slot, 1 card per size
  | "carousel-3"    // 3 slots, 3 slides per size (IG carousel)
  | "carousel-5"    // 5 slots, 5 slides
  | "story-only"    // 1 slot, only renders ig_story size
  | "recap-weekly"  // singleton — auto-picks top atoms of the week

interface Slot { atomType: AtomType; atomId: number }

interface GenerateRequest {
  layout: Layout
  slots: Slot[]          // length must match layout's required slot count
  style: "minimal-serif" | "bold-crimson" | "magazine"
  toneHint?: "punchy" | "analytical" | "warm" | null
  useAiImage: boolean    // default false; ignored on gated layouts/atom-types
}
```

### AI image gating (server- and client-side)

| Layout | useAiImage allowed? | Reason |
|---|---|---|
| `single` (atom = prediction/debate/voice/pulse/about-pillar/about-founder) | ✅ | Atom has a scene/portrait that AI can render |
| `single` (atom = about-belief/about-region) | ❌ | Pure text card / data viz — AI distorts |
| `carousel-3`, `carousel-5` | ✅ if **all slots** are AI-eligible atom types | Per-slot eligibility composes |
| `story-only` | ✅ if slot atom is AI-eligible | Same as `single` |
| `recap-weekly` | ❌ | Composite of multiple items — one AI image misrepresents the mix |
| any layout including `manifesto` slot | ❌ | Typographic hero — AI breaks the look |

### Backend changes

1. **No schema migration required for Phase 1.** Continue storing one row per
   `(contentType, contentId, template, size, slideIndex)`. Encode the
   composition by keeping per-slide `contentType` distinct (a mixed carousel
   produces 3 rows with `contentType` "prediction" / "voice" / "pulse"). Add
   one virtual JSON column `composition_meta` later if needed.
2. **Add columns** `layout` (text), `use_ai_image` (boolean), `kit_id` (text,
   uuid grouping slides) to `press_kit_assets`. Migration file
   `lib/db/drizzle/0010_studio_compose_v2.sql`.
3. **Rewrite `POST /api/cms/studio/generate`** to accept the new shape. Keep a
   compat shim that translates the old `{ postType, sourceId }` to
   `{ layout, slots }` so any external caller (or tests) keeps working.
4. **Server-side gating** rejects `useAiImage: true` for any slot whose
   atom type isn't AI-eligible with HTTP 400 and a clear message.
5. **`loadSlot(atomType, atomId)`** — refactor the existing `loadSource` to be
   per-slot rather than per-postType. Already 90% there in the codebase.
6. **Caption variants** for carousels: pass *all* slot captions to Claude in
   one request; ask it to write a per-platform caption that summarizes the
   whole carousel rather than slide-by-slide. Single-slot stays the same.

### Frontend changes — 3-pane master→detail layout (LOCKED 2026-05-18)

Replace the dense single `POST TYPE` column with a **3-pane master-detail**:

- **Left rail (slim) = FORMAT.** Only the layout/format choices:
  Single · Carousel·3 · Carousel·5 · Story · Weekly recap. This is the
  master selection — it decides the slot count.
- **Center = COMPOSE.** Reveals contextual options for the chosen format:
  the slot list (1 / 3 / 5 / recap-auto) + an A–Z, type-filterable,
  searchable library to fill slots. This is where "which posts to link"
  happens.
- **Right column = PREVIEW (top) + CAPTIONS (below).** Rendered asset preview
  stacked above the X / IG / LinkedIn caption editors. Style + tone + AI
  checkbox + Generate-kit live at the foot of the center or right pane.

```
┌─ FORMAT ─┐┌─ COMPOSE ───────────┐┌─ PREVIEW ──┐
│ ● Single ││ Slot 1 ▸ tap a post  ││ [ IG sq ]  │
│   Carou·3││ Slot 2 ▸ …           ││            │
│   Carou·5││ Slot 3 ▸ …           │├─ CAPTIONS ─┤
│   Story  ││                      ││ X  V1V2V3  │
│   Recap  ││ LIBRARY 🔍 search    ││ IG V1V2V3  │
│          ││ [All|Deb|Pred|Voi|…] ││ LI V1V2V3  │
│          ││ A Abu Dhabi will…    ││            │
│          ││ A AI adoption…       ││ Style ▸    │
│          ││ B Baghdad airport…   ││ Tone ▸     │
│          ││ …(A–Z, virtualized)  ││ ☐ AI image │
│          ││                      ││ [GENERATE] │
└──────────┘└──────────────────────┘└────────────┘
```

- Library rows are sorted **A–Z by label** within the active type tab, with
  a search box and a status filter (Approved / All). Multi-select fills the
  next empty slot; a filled slot shows an `in slot N` badge on its row.
- Selecting a format on the left re-pads the center slot list.
- `recap-weekly` format shows no slot picker — center shows a readonly
  "auto-picks top debate + prediction + pulse of the week" note.

State shape (replaces the current `postType`/`sourceId`/`assets` triplet for
input; `assets` output stays):

```ts
const [layout, setLayout] = useState<Layout>("single")
const [slots, setSlots] = useState<Slot[]>([])
const [libraryTab, setLibraryTab] = useState<AtomType | "all">("all")
const [librarySearch, setLibrarySearch] = useState("")
const [style, setStyle] = useState<Style>("minimal-serif")
const [tone, setTone] = useState<Tone>(null)
const [useAiImage, setUseAiImage] = useState(false)
```

Behavior:
- Switching `layout` re-pads `slots` to the new required length (trims or
  appends empty slots). Empty slots show as "Tap a library row" hints.
- Clicking a library row fills the next empty slot. If the slot is full,
  clicking a different row replaces the *most recent* slot (with toast).
- Slots support drag-to-reorder via `react-dnd` or HTML5 native drag (we
  already have `motion`/dnd-kit available — pick the lightest path).
- `useAiImage` checkbox hidden when current slots include any gated atom
  type. Surface a tiny inline note: "AI image not available for `about-region`
  / `weekly recap`".
- Backward-compat: existing assets (with old `contentType` like `item-voice`)
  still render via the asset list endpoint — we only change *input* shape;
  the output stays compatible.

### Nano Banana generalization

`services/nano-banana.ts` — keep the locked B&W + halftone style across all
atom types. Vary only the *subject description*:

| Atom type | Subject template |
|---|---|
| `voice` | Existing portrait prompt (head-and-shoulders of the person) |
| `prediction` | "Photographic scene illustrating: {question}. {category} context." |
| `debate` | "Photographic scene of the debate topic: {question}." |
| `pulse` | "Thematic scene illustrating: {title}. {stat} {delta}." |
| `about-pillar` | "Symbolic editorial illustration of: {pillarTitle}. {pillarBody}" |
| `about-founder` | Skip — use real photo if `imageUrl` set, else fall back to typographic card |

Variant generation (the old I1/I2/I3 chip UX) is **dropped for v2**. The
checkbox is binary: on → generate 1 AI image per slot during kit generation.
If the admin doesn't like the result, they click Generate Kit again to roll a
new one. This matches the "tick is false by default" simplification the user
asked for.

### Full-bleed template

New `aiBackgroundCard.ts` template, used whenever `useAiImage: true`:

```
┌──────────────────────────┐
│ [AI image, full-bleed,    │
│  B&W halftone, 100% cover]│
│                           │
│  Dark gradient overlay at │
│  bottom 40% for legibility│
│                           │
│  "Quote / headline"      │
│  in white type            │
│  — Attribution            │
│  THETRIBUNAL.COM          │
└──────────────────────────┘
```

Used for every atom type when `useAiImage: true`. When false, render the
existing templated card (prediction-momentum, voice-quote, pulse-stat, etc.).

### Out of scope for this session

- Schema migration for `composition_meta` JSONB (defer; not needed for v1).
- Variant chip UX (I1/I2/I3) — dropping per user's "tick is false by default"
  framing.
- Per-slot AI image override inside a carousel — global toggle for v1.
- Drag-to-reorder slots — implement with native HTML5 drag for v1; defer
  fancy dnd-kit if time-constrained.

## Implementation phases (with realistic time)

| Phase | Scope | Est |
|---|---|---|
| 1 | New schema columns + migration + `POST /generate` accepts new shape (compat shim for old shape) | 60 min |
| 2 | New Compose column UI: Layout selector + Slots tray + Tabbed Library | 90 min |
| 3 | Replace AI Portrait panel (I1/I2/I3 chips) with single checkbox + gating | 30 min |
| 4 | `services/nano-banana.ts` generalize per atom + `aiBackgroundCard` template | 75 min |
| 5 | E2E browser test of: Single·Prediction·AI-off, Single·Voice·AI-on, Carousel-3·mixed·AI-off, Carousel-3·all-AI-eligible·AI-on | 30 min |
| **Total** | | **~4–5 hours** |

## Resolved decisions (2026-05-18)

- **Layout:** 3-pane master-detail. Left = FORMAT, Center = COMPOSE, Right =
  PREVIEW (top) + CAPTIONS (below). LOCKED.
- **Drag-to-reorder slots:** HTML5 native drag for v1 (no new dep).
- **"All" library tab:** recency-mixed across atom types; type tabs sort A–Z.
- **Recap-weekly:** auto-only, no slot picker (readonly note in center).
- **AI image:** single checkbox, default off, gated list as agreed; full-bleed
  background + overlay; global per kit; I1/I2/I3 chips dropped.

## Progress log

- **Phase 1 — DONE (code).** Schema columns `layout` / `kit_id` /
  `use_ai_image` added to `press-kit.ts` + migration
  `0010_studio_compose_v2.sql`. `lib/db` project rebuilt. New
  `POST /cms/studio/compose` (Layout × Slots, AI gating, kitId grouping) +
  `GET /cms/studio/kit?kitId=` endpoints. api-server typecheck clean.
  Validation/gating smoke-tested (invalid_layout, ai_image_not_allowed,
  slot-count mismatch all correct). **Blocked on:** live DB migration must be
  run by the user (classifier denies agent-run prod schema changes) before the
  render+insert path works end-to-end.

- **Phase 2+3 — DONE (code, verified).** `studio.tsx` rebuilt to the locked
  3-pane master-detail (FORMAT rail / COMPOSE center / PREVIEW+CAPTIONS right);
  `api.ts` gained `studioCompose` + `studioGetKit`. Old AI-Portrait I1/I2/I3
  panel + all portrait state removed; replaced with the single gated
  "Generate AI image" checkbox. `cd artifacts/cms && tsc --noEmit` → exit 0.
  Independently verified: 3-pane grid present, endpoints wired, portrait code
  gone, new state model in place. Multi-slot caption Save/Regen + ZIP are
  best-effort/disabled for v1 (documented).
- **Phase 4 — DONE (code).** `services/nano-banana.ts` generalized:
  `generateAtomImageToStorage(caption, kitId, slotIndex)` with per-atom subject
  prompts + one locked B&W-halftone style suffix. New full-bleed template
  `templates/ai-background.ts` (image + bottom gradient + overlaid
  eyebrow/headline/attribution + THETRIBUNAL.COM). Compose endpoint wires it:
  `useAiImage` → one image per slot reused across sizes, graceful per-slot
  fallback to the templated card, `aiImageErrors[]` surfaced in the response.
  api-server `tsc --noEmit` → exit 0.
- **Phase 5 — BLOCKED.** Full E2E needs the 0010 migration applied (live DB
  still missing `layout`/`kit_id`/`use_ai_image` — `/kit` 500s, confirmed via
  api-server log). Browser extension also disconnected mid-session. Code is
  done; only the user-run migration + a browser pass remain.

## Review checklist

Implementing now, phase by phase, commit after each:

- [ ] Open a feature branch `studio-compose-v2`
- [ ] Run each phase, commit at the end of each
- [ ] Update `tasks/social-studio-compose-v2.md` review section after each
- [ ] Browser-test after Phase 3 (UI checkpoint) and Phase 5 (full e2e)
- [ ] Capture lessons in `tasks/lessons.md`

—

**Awaiting your "go" before I start writing code.**
