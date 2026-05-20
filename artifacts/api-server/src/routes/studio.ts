/**
 * CMS-protected Studio v2 routes. Generates branded social-media assets +
 * AI captions for any post type — per-item, About-page series, carousels,
 * weekly recap, manifesto.
 *
 * Endpoints:
 *  - POST /api/cms/studio/generate
 *      body: { postType, sourceId?, style?, sizes?, toneHint? }
 *      Renders all (size × slide) combos for the chosen post type and style,
 *      uploads to R2, upserts rows into press_kit_assets, returns assets +
 *      caption variants.
 *
 *  - GET /api/cms/studio/assets?postType=...&sourceId=...&style=...
 *      Lists existing assets for the given filter.
 *
 *  - POST /api/cms/studio/captions
 *      body: { postType, sourceId, platform?, toneHint? }
 *      Regenerates caption variants (optionally for one platform with a tone hint).
 *
 *  - POST /api/cms/studio/captions/save
 *      body: { postType, sourceId, platform, text }
 *      Saves the user's chosen/edited caption per platform.
 *
 *  - GET /api/cms/studio/download/:assetId
 *      Streams the asset PNG directly to the browser as an attachment
 *      (no R2 round-trip from the user's browser).
 *
 *  - GET /api/cms/studio/zip?postType=...&sourceId=...&style=...
 *      Bundles all assets for the filter into a ZIP and streams it.
 *
 *  - GET /api/cms/studio/sources/:postType
 *      Returns the list of available sources for the post type so the UI
 *      can render a picker (e.g., all approved debates, or all pillars).
 */

import { Router, type Request, type Response, type NextFunction } from "express"
import {
  db,
  pressKitAssetsTable,
  cmsSessionsTable,
  pollsTable,
  pollOptionsTable,
  predictionsTable,
  profilesTable,
  pulseTopicsTable,
  cmsConfigsTable,
} from "@workspace/db"
import { and, desc, eq, gt, inArray } from "drizzle-orm"
import {
  ALL_SIZE_KEYS,
  isValidSize,
  TEMPLATE_STYLES,
  type TemplateStyle,
  type SizeKey,
  type Platform,
  type ToneHint,
  type CaptionInput,
  type CaptionVariants,
  generateCaptionVariants,
  renderToPng,
  uploadAsset,
  pollResultSplit,
  predictionMomentum,
  voiceQuote,
  pulseStat,
  founderQuote,
  pillarCard,
  beliefCard,
  regionCard,
  manifestoCard,
  pillarsCarousel,
  debateCarousel,
  pulseTrio,
  weeklyRecap,
  aiBackgroundCard,
  loadWeeklyTops,
  type WeeklyTops,
  POST_TYPE_FAMILIES,
  type PostType,
} from "../lib/press-kit/index.js"
import { getBrandTokens } from "../lib/design-tokens-cache.js"
import { R2_BUCKET, r2Client } from "../utils/r2.js"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { bundleZip } from "../lib/press-kit/zip.js"
import { getAsset, isMemKey } from "../lib/press-kit/asset-store.js"
import {
  generatePortraitVariant,
  deleteUnchosenPortraits,
  generateAtomImageToStorage,
  isNanoBananaAvailable,
  type VoiceSubject,
} from "../services/nano-banana.js"
import { supabaseAdmin, isSupabaseStorageAvailable, STORAGE_BUCKET } from "../utils/supabase-storage.js"
import { randomUUID } from "node:crypto"

const router = Router()

// CMS auth — same pattern as cms.ts and press-kit.ts
async function requireCmsAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers["x-cms-token"] as string | undefined
  if (!token) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  try {
    const [session] = await db
      .select()
      .from(cmsSessionsTable)
      .where(and(eq(cmsSessionsTable.token, token), gt(cmsSessionsTable.expiresAt, new Date())))
    if (!session) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    next()
  } catch (err) {
    console.error("[studio] auth check failed:", err)
    res.status(500).json({ error: "Auth check failed" })
  }
}

let warnedAppUrl = false
function appUrl(): string {
  const url = process.env.APP_URL
  if (url) return url
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL env var is required in production (used in caption links)")
  }
  if (!warnedAppUrl) {
    console.warn("[studio] APP_URL not set — using https://themiddleeasthustle.com as a dev default for caption links")
    warnedAppUrl = true
  }
  return "https://themiddleeasthustle.com"
}

function downloadUrlFor(assetId: number): string {
  return `/api/cms/studio/download/${assetId}`
}

const VALID_POST_TYPES = new Set(Object.keys(POST_TYPE_FAMILIES))

function isValidStyle(s: unknown): s is TemplateStyle {
  return typeof s === "string" && TEMPLATE_STYLES.includes(s as TemplateStyle)
}

// ── Compose v2: Layout × Slots model ──────────────────────────────
//
// A "layout" is the presentation shape; a "slot" is one content atom.
// Each atom type maps to an existing v1 postType so loadSource() stays the
// single source-resolution engine.

type AtomType =
  | "debate" | "prediction" | "voice" | "pulse"
  | "about-founder" | "about-pillar" | "about-belief" | "about-region"
  | "manifesto"
type Layout = "single" | "carousel-3" | "carousel-5" | "story-only" | "recap-weekly"

const ATOM_TO_POSTTYPE: Record<AtomType, PostType> = {
  debate: "item-poll",
  prediction: "item-prediction",
  voice: "item-voice",
  pulse: "item-pulse",
  "about-founder": "about-founder",
  "about-pillar": "about-pillar",
  "about-belief": "about-belief",
  "about-region": "about-region",
  manifesto: "manifesto",
}

// Atom types where a brand-styled AI image is sensible. about-belief is pure
// text, about-region is data-viz, manifesto is a typographic hero — AI imagery
// would distort or break those, so the toggle is hidden/locked for them.
const AI_ELIGIBLE_ATOMS = new Set<AtomType>([
  "debate", "prediction", "voice", "pulse", "about-pillar", "about-founder",
])

const LAYOUT_SLOT_COUNT: Record<Layout, number> = {
  single: 1,
  "carousel-3": 3,
  "carousel-5": 5,
  "story-only": 1,
  "recap-weekly": 0, // auto-composed, no slot picker
}

function isAtomType(v: unknown): v is AtomType {
  return typeof v === "string" && v in ATOM_TO_POSTTYPE
}
function isLayout(v: unknown): v is Layout {
  return typeof v === "string" && v in LAYOUT_SLOT_COUNT
}

// recap-weekly can't take an AI image (it composites several items); story-only
// and single/carousel inherit eligibility from their slot atom types.
function aiAllowedForKit(layout: Layout, slots: Array<{ atomType: AtomType }>): boolean {
  if (layout === "recap-weekly") return false
  if (slots.length === 0) return false
  return slots.every((s) => AI_ELIGIBLE_ATOMS.has(s.atomType))
}

// Map a slot's CaptionInput → the overlay text for the full-bleed AI card.
function aiCardFromCaption(caption: CaptionInput, imageUrl: string): {
  imageUrl: string
  eyebrow: string
  headline: string
  attribution?: string
} {
  const cut = (s: string | undefined, n: number) =>
    s && s.length > n ? `${s.slice(0, n)}…` : (s ?? "")
  switch (caption.contentType) {
    case "voice":
      return {
        imageUrl,
        eyebrow: "VOICE",
        headline: `“${cut(caption.quote, 180)}”`,
        attribution: caption.voicesName ?? undefined,
      }
    case "prediction":
      return {
        imageUrl,
        eyebrow: "PREDICTION",
        headline: cut(caption.question, 180),
        attribution: caption.winningPercentage != null
          ? `${Math.round(caption.winningPercentage)}% say ${caption.winningOption ?? "yes"}`
          : caption.category ?? undefined,
      }
    case "poll":
      return {
        imageUrl,
        eyebrow: "DEBATE",
        headline: cut(caption.question, 180),
        attribution: caption.winningPercentage != null && caption.winningOption
          ? `${Math.round(caption.winningPercentage)}% chose ${caption.winningOption}`
          : undefined,
      }
    case "pulse":
      return {
        imageUrl,
        eyebrow: "THE PULSE",
        headline: cut(caption.question || caption.stat, 160),
        attribution: caption.stat ?? undefined,
      }
    case "about-pillar":
      return { imageUrl, eyebrow: "PILLAR", headline: cut(caption.pillarTitle, 120), attribution: cut(caption.pillarBody, 80) || undefined }
    case "about-founder":
      return { imageUrl, eyebrow: "FROM THE FOUNDER", headline: cut(caption.founderText, 200), attribution: caption.founderAuthor ?? undefined }
    default:
      return { imageUrl, eyebrow: "THE TRIBUNAL", headline: cut(caption.question, 160) }
  }
}

interface AboutConfig {
  hero?: { tagline?: string; titleLine1?: string; titleLine2?: string; subtitle?: string }
  pillars?: Array<{ num: string; title: string; body: string; cta?: string; link?: string }>
  beliefs?: Array<{ num: string; title: string; body: string }>
  founderStatement?: { text: string; author: string }
  regionCoverage?: Array<{ name: string; flag: string; population: string }>
  punctuations?: string[]
}

async function loadAbout(): Promise<AboutConfig> {
  const [row] = await db
    .select()
    .from(cmsConfigsTable)
    .where(eq(cmsConfigsTable.key, "page_about"))
  return ((row?.value as AboutConfig) ?? {})
}

interface SourceData {
  type: PostType
  sourceId: number
  // contentType field stored in DB; for v2 this matches the postType
  storedContentType: string
  // for caption building
  caption: CaptionInput
  // satori-element factory (returns one element OR array of elements for carousels)
  buildElements: (style: TemplateStyle, size: SizeKey) => Promise<any[]> | any[]
  slideCount: number
}

async function loadSource(postType: PostType, sourceId: number): Promise<SourceData> {
  const tokens = await getBrandTokens()

  // ── per-item ───────────────────────────────────────────────────
  if (postType === "item-poll") {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, sourceId))
    if (!poll) throw new Error("not_found")
    const opts = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, sourceId))
    const total = opts.reduce((s, o) => s + (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0), 0)
    const options = opts.map((o) => ({
      text: o.text,
      percentage: total > 0 ? ((o.voteCount ?? 0) + (o.dummyVoteCount ?? 0)) / total * 100 : 0,
    }))
    const winner = options.reduce(
      (best, o) => (o.percentage > (best?.percentage ?? 0) ? o : best),
      undefined as { text: string; percentage: number } | undefined,
    )
    return {
      type: postType,
      sourceId,
      storedContentType: "poll",
      caption: {
        contentType: "poll",
        contentId: sourceId,
        question: poll.question,
        category: poll.category,
        winningOption: winner?.text,
        winningPercentage: winner?.percentage,
      },
      buildElements: (style, size) => [
        pollResultSplit(
          { question: poll.question, category: poll.category, totalVotes: total, options },
          tokens,
          size,
          style,
        ),
      ],
      slideCount: 1,
    }
  }

  if (postType === "item-prediction") {
    const [pred] = await db.select().from(predictionsTable).where(eq(predictionsTable.id, sourceId))
    if (!pred) throw new Error("not_found")
    const days = pred.resolvesAt
      ? Math.max(0, Math.round((new Date(pred.resolvesAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null
    return {
      type: postType,
      sourceId,
      storedContentType: "prediction",
      caption: { contentType: "prediction", contentId: sourceId, question: pred.question },
      buildElements: (style, size) => [
        predictionMomentum(
          {
            question: pred.question,
            yesPercentage: pred.yesPercentage,
            totalVotes: pred.totalCount + (pred.dummyTotalCount ?? 0),
            daysToResolve: days,
          },
          tokens,
          size,
          style,
        ),
      ],
      slideCount: 1,
    }
  }

  if (postType === "item-voice") {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, sourceId))
    if (!profile) throw new Error("not_found")
    return {
      type: postType,
      sourceId,
      storedContentType: "voice",
      caption: {
        contentType: "voice",
        contentId: sourceId,
        voicesName: profile.name,
        quote: profile.quote ?? profile.headline ?? "",
      },
      buildElements: (style, size) => [
        voiceQuote(
          {
            name: profile.name,
            role: profile.role ?? "",
            company: profile.company ?? undefined,
            quote: profile.quote ?? profile.headline ?? "",
            imageUrl: profile.imageUrl ?? undefined,
          },
          tokens,
          size,
          style,
        ),
      ],
      slideCount: 1,
    }
  }

  if (postType === "item-pulse") {
    const [topic] = await db.select().from(pulseTopicsTable).where(eq(pulseTopicsTable.id, sourceId))
    if (!topic) throw new Error("not_found")
    return {
      type: postType,
      sourceId,
      storedContentType: "pulse",
      caption: { contentType: "pulse", contentId: sourceId, stat: topic.stat },
      buildElements: (style, size) => [
        pulseStat(
          {
            title: topic.title,
            stat: topic.stat,
            delta: topic.delta ?? undefined,
            deltaUp: topic.deltaUp,
            source: topic.source ?? undefined,
          },
          tokens,
          size,
          style,
        ),
      ],
      slideCount: 1,
    }
  }

  // ── about ──────────────────────────────────────────────────────
  if (postType === "about-founder") {
    const cfg = await loadAbout()
    const text = cfg.founderStatement?.text ?? ""
    const author = cfg.founderStatement?.author ?? ""
    if (!text) throw new Error("about_founder_empty")
    return {
      type: postType,
      sourceId: 0,
      storedContentType: "about-founder",
      caption: { contentType: "about-founder", contentId: 0, founderText: text, founderAuthor: author },
      buildElements: (style, size) => [founderQuote({ text, author }, tokens, size, style)],
      slideCount: 1,
    }
  }

  if (postType === "about-pillar") {
    const cfg = await loadAbout()
    const pillars = cfg.pillars ?? []
    if (pillars.length === 0) throw new Error("about_pillars_empty")
    const pillar = pillars[sourceId]
    if (!pillar) throw new Error("about_pillar_index_out_of_range")
    return {
      type: postType,
      sourceId,
      storedContentType: "about-pillar",
      caption: {
        contentType: "about-pillar",
        contentId: sourceId,
        pillarTitle: pillar.title,
        pillarBody: pillar.body,
      },
      buildElements: (style, size) => [pillarCard(pillar, tokens, size, style)],
      slideCount: 1,
    }
  }

  if (postType === "about-belief") {
    const cfg = await loadAbout()
    const beliefs = cfg.beliefs ?? []
    if (beliefs.length === 0) throw new Error("about_beliefs_empty")
    const belief = beliefs[sourceId]
    if (!belief) throw new Error("about_belief_index_out_of_range")
    return {
      type: postType,
      sourceId,
      storedContentType: "about-belief",
      caption: {
        contentType: "about-belief",
        contentId: sourceId,
        beliefTitle: belief.title,
        beliefBody: belief.body,
      },
      buildElements: (style, size) => [beliefCard(belief, tokens, size, style)],
      slideCount: 1,
    }
  }

  if (postType === "about-region") {
    const cfg = await loadAbout()
    const countries = cfg.regionCoverage ?? []
    if (countries.length === 0) throw new Error("about_region_empty")
    return {
      type: postType,
      sourceId: 0,
      storedContentType: "about-region",
      caption: { contentType: "about-region", contentId: 0, regionCount: countries.length },
      buildElements: (style, size) => [regionCard({ countries }, tokens, size, style)],
      slideCount: 1,
    }
  }

  // ── manifesto ──────────────────────────────────────────────────
  if (postType === "manifesto") {
    const cfg = await loadAbout()
    const hero = cfg.hero ?? {}
    if (!hero.titleLine1) throw new Error("about_hero_empty")
    return {
      type: postType,
      sourceId: 0,
      storedContentType: "manifesto",
      caption: {
        contentType: "manifesto",
        contentId: 0,
        manifestoTitle: `${hero.titleLine1 ?? ""} ${hero.titleLine2 ?? ""}`.trim(),
        manifestoSubtitle: hero.subtitle ?? "",
      },
      buildElements: (style, size) => [
        manifestoCard(
          {
            tagline: hero.tagline ?? "",
            titleLine1: hero.titleLine1 ?? "",
            titleLine2: hero.titleLine2 ?? "",
            punctuation: cfg.punctuations?.[0] ?? ".",
            subtitle: hero.subtitle ?? "",
          },
          tokens,
          size,
          style,
        ),
      ],
      slideCount: 1,
    }
  }

  // ── carousels ──────────────────────────────────────────────────
  if (postType === "carousel-pillars") {
    const cfg = await loadAbout()
    const pillars = cfg.pillars ?? []
    if (pillars.length === 0) throw new Error("about_pillars_empty")
    return {
      type: postType,
      sourceId: 0,
      storedContentType: "carousel-pillars",
      caption: { contentType: "carousel-pillars", contentId: 0 },
      buildElements: (style, size) => pillarsCarousel({ pillars }, tokens, size, style),
      slideCount: pillars.length,
    }
  }

  if (postType === "carousel-debate") {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, sourceId))
    if (!poll) throw new Error("not_found")
    const opts = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, sourceId))
    const total = opts.reduce((s, o) => s + (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0), 0)
    const options = opts.map((o) => ({
      text: o.text,
      percentage: total > 0 ? ((o.voteCount ?? 0) + (o.dummyVoteCount ?? 0)) / total * 100 : 0,
    }))
    return {
      type: postType,
      sourceId,
      storedContentType: "carousel-debate",
      caption: {
        contentType: "carousel-debate",
        contentId: sourceId,
        question: poll.question,
        category: poll.category,
      },
      buildElements: (style, size) =>
        debateCarousel(
          {
            question: poll.question,
            category: poll.category,
            context: poll.context ?? undefined,
            totalVotes: total,
            options,
          },
          tokens,
          size,
          style,
        ),
      slideCount: 3,
    }
  }

  if (postType === "carousel-pulse-trio") {
    const items = await db
      .select()
      .from(pulseTopicsTable)
      .where(eq(pulseTopicsTable.editorialStatus, "approved"))
      .orderBy(desc(pulseTopicsTable.createdAt))
      .limit(3)
    if (items.length === 0) throw new Error("pulse_topics_empty")
    return {
      type: postType,
      sourceId: 0,
      storedContentType: "carousel-pulse-trio",
      caption: { contentType: "carousel-pulse-trio", contentId: 0 },
      buildElements: (style, size) =>
        pulseTrio(
          {
            items: items.map((p) => ({
              title: p.title,
              stat: p.stat,
              delta: p.delta ?? undefined,
              deltaUp: p.deltaUp,
              source: p.source ?? undefined,
            })),
          },
          tokens,
          size,
          style,
        ),
      slideCount: items.length,
    }
  }

  // ── recap ──────────────────────────────────────────────────────
  if (postType === "recap-weekly") {
    const tops: WeeklyTops = await loadWeeklyTops()
    if (!tops.topDebate || !tops.topPrediction || !tops.topPulse) {
      throw new Error("recap_insufficient_data")
    }
    return {
      type: postType,
      sourceId: 0,
      storedContentType: "recap-weekly",
      caption: {
        contentType: "recap-weekly",
        contentId: 0,
        recapItems: [
          { kind: "debate", title: tops.topDebate.question },
          { kind: "prediction", title: tops.topPrediction.question },
          { kind: "pulse", title: tops.topPulse.title },
        ],
      },
      buildElements: (style, size) =>
        weeklyRecap(
          {
            weekLabel: tops.weekLabel,
            topDebate: {
              question: tops.topDebate!.question,
              category: tops.topDebate!.category ?? undefined,
              winningOption: tops.topDebate!.winningOption ?? undefined,
              winningPercentage: tops.topDebate!.winningPercentage ?? undefined,
            },
            topPrediction: {
              question: tops.topPrediction!.question,
              yesPercentage: tops.topPrediction!.yesPercentage,
            },
            topPulse: {
              title: tops.topPulse!.title,
              stat: tops.topPulse!.stat,
              delta: tops.topPulse!.delta ?? undefined,
              deltaUp: tops.topPulse!.deltaUp,
            },
          },
          tokens,
          size,
          style,
        ),
      slideCount: 4,
    }
  }

  throw new Error(`unknown_post_type: ${postType}`)
}

// ── POST /cms/studio/generate ──────────────────────────────────────
router.post("/cms/studio/generate", requireCmsAuth, async (req, res) => {
  const { postType, sourceId, style: styleRaw, sizes, toneHint } = req.body ?? {}
  if (!VALID_POST_TYPES.has(postType)) return res.status(400).json({ error: "invalid_post_type" })
  const style: TemplateStyle = isValidStyle(styleRaw) ? styleRaw : "minimal-serif"
  const requestedSizes: SizeKey[] = Array.isArray(sizes) && sizes.length
    ? (sizes as string[]).filter(isValidSize)
    : ALL_SIZE_KEYS
  const safeToneHint: ToneHint = ["punchy", "analytical", "warm"].includes(toneHint) ? toneHint : null
  const safeSourceId = typeof sourceId === "number" ? sourceId : 0

  let source: SourceData
  try {
    source = await loadSource(postType as PostType, safeSourceId)
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : "load_failed" })
  }

  // Generate caption variants once per (postType, sourceId)
  let captionVariants: CaptionVariants
  try {
    captionVariants = await generateCaptionVariants(source.caption, appUrl(), { toneHint: safeToneHint })
  } catch (err) {
    console.error("[studio] caption generation failed:", err)
    captionVariants = { x: ["", "", ""], ig: ["", "", ""], linkedin: ["", "", ""] }
  }

  const family = POST_TYPE_FAMILIES[postType as PostType]

  // Render every (size × slide) combination in parallel
  const renderJobs: Array<{ size: SizeKey; slideIndex: number; slideTotal: number; element: any }> = []
  for (const size of requestedSizes) {
    const elements = await source.buildElements(style, size)
    elements.forEach((element, slideIndex) => {
      renderJobs.push({ size, slideIndex, slideTotal: elements.length, element })
    })
  }

  const results = await Promise.allSettled(
    renderJobs.map(async (job) => {
      const buf = await renderToPng(job.element, job.size)
      const upload = await uploadAsset(
        buf,
        source.storedContentType,
        source.sourceId,
        `${postType}-${style}`,
        job.size,
        job.slideIndex,
      )
      return { ...job, upload }
    }),
  )

  const generated: Array<{
    template: string
    style: TemplateStyle
    size: SizeKey
    slideIndex: number
    slideTotal: number
    publicUrl: string
    assetId?: number
  }> = []
  const failures: Array<{ size: string; slideIndex: number; error: string }> = []

  for (let i = 0; i < results.length; i++) {
    const job = renderJobs[i]
    const result = results[i]
    if (result.status === "rejected") {
      failures.push({ size: job.size, slideIndex: job.slideIndex, error: String(result.reason ?? "render_failed") })
      continue
    }
    const { upload } = result.value
    const [row] = await db
      .insert(pressKitAssetsTable)
      .values({
        contentType: source.storedContentType,
        contentId: source.sourceId,
        template: `${postType}-${style}`,
        size: job.size,
        slideIndex: job.slideIndex,
        slideCount: job.slideTotal,
        templateFamily: family,
        templateStyle: style,
        r2Key: upload.r2Key,
        captionX: captionVariants.x[0] ?? null,
        captionIg: captionVariants.ig[0] ?? null,
        captionLi: captionVariants.linkedin[0] ?? null,
        captionVariants,
        toneHint: safeToneHint,
      })
      .onConflictDoUpdate({
        target: [
          pressKitAssetsTable.contentType,
          pressKitAssetsTable.contentId,
          pressKitAssetsTable.template,
          pressKitAssetsTable.size,
          pressKitAssetsTable.slideIndex,
        ],
        set: {
          r2Key: upload.r2Key,
          slideCount: job.slideTotal,
          templateFamily: family,
          templateStyle: style,
          captionX: captionVariants.x[0] ?? null,
          captionIg: captionVariants.ig[0] ?? null,
          captionLi: captionVariants.linkedin[0] ?? null,
          captionVariants,
          toneHint: safeToneHint,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pressKitAssetsTable.id })
    generated.push({
      template: `${postType}-${style}`,
      style,
      size: job.size,
      slideIndex: job.slideIndex,
      slideTotal: job.slideTotal,
      publicUrl: row?.id ? downloadUrlFor(row.id) : upload.publicUrl,
      assetId: row?.id,
    })
  }

  return res.json({ generated, failures, captionVariants, style, postType, sourceId: source.sourceId })
})

// ── POST /cms/studio/compose (Compose v2) ──────────────────────────
//
// Body: { layout, slots:[{atomType,atomId}], style, toneHint, useAiImage }
// Renders one slide per slot (mixed atoms allowed for carousels), groups all
// (slide × size) rows under a single kitId so the kit can be re-fetched via
// GET /cms/studio/kit?kitId=…
//
// Phase 1 scope: useAiImage is validated + persisted but rendering still uses
// the templated card. Full-bleed AI background rendering lands in Phase 4.
// Captions for multi-slot kits derive from slot 1 for now (multi-atom caption
// synthesis is a Phase 4 refinement).
router.post("/cms/studio/compose", requireCmsAuth, async (req, res) => {
  const { layout: layoutRaw, slots: slotsRaw, style: styleRaw, toneHint, useAiImage } = req.body ?? {}

  if (!isLayout(layoutRaw)) return res.status(400).json({ error: "invalid_layout" })
  const layout: Layout = layoutRaw
  const style: TemplateStyle = isValidStyle(styleRaw) ? styleRaw : "minimal-serif"
  const safeToneHint: ToneHint = ["punchy", "analytical", "warm"].includes(toneHint) ? toneHint : null
  const wantAiImage = useAiImage === true

  // Resolve slots. recap-weekly is auto-composed (no slot picker): treat it as
  // a single pseudo-slot that delegates to the existing recap loader.
  type ResolvedSlot = { atomType: AtomType | "recap"; atomId: number; source: SourceData }
  const resolved: ResolvedSlot[] = []

  if (layout === "recap-weekly") {
    try {
      const source = await loadSource("recap-weekly" as PostType, 0)
      resolved.push({ atomType: "recap", atomId: 0, source })
    } catch (err) {
      return res.status(404).json({ error: err instanceof Error ? err.message : "recap_load_failed" })
    }
  } else {
    if (!Array.isArray(slotsRaw)) return res.status(400).json({ error: "slots_required" })
    const need = LAYOUT_SLOT_COUNT[layout]
    if (slotsRaw.length !== need) {
      return res.status(400).json({ error: `layout_${layout}_needs_${need}_slots`, got: slotsRaw.length })
    }
    const parsed: Array<{ atomType: AtomType; atomId: number }> = []
    for (const s of slotsRaw) {
      if (!s || !isAtomType(s.atomType) || typeof s.atomId !== "number") {
        return res.status(400).json({ error: "invalid_slot", slot: s })
      }
      parsed.push({ atomType: s.atomType, atomId: s.atomId })
    }
    if (wantAiImage && !aiAllowedForKit(layout, parsed)) {
      return res.status(400).json({
        error: "ai_image_not_allowed_for_kit",
        detail: "One or more slot atom types (or this layout) cannot use AI imagery.",
      })
    }
    for (const p of parsed) {
      try {
        const source = await loadSource(ATOM_TO_POSTTYPE[p.atomType], p.atomId)
        resolved.push({ atomType: p.atomType, atomId: p.atomId, source })
      } catch (err) {
        return res.status(404).json({ error: err instanceof Error ? err.message : "load_failed", atom: p })
      }
    }
  }

  // story-only renders just the vertical 9:16; everything else renders all sizes.
  const requestedSizes: SizeKey[] = layout === "story-only"
    ? (["ig_story"].filter(isValidSize) as SizeKey[])
    : ALL_SIZE_KEYS

  // Caption variants: derive from the first slot (Phase 1). Multi-atom
  // synthesis for carousels is a Phase 4 refinement.
  let captionVariants: CaptionVariants
  try {
    captionVariants = await generateCaptionVariants(resolved[0].source.caption, appUrl(), { toneHint: safeToneHint })
  } catch (err) {
    console.error("[studio/compose] caption generation failed:", err)
    captionVariants = { x: ["", "", ""], ig: ["", "", ""], linkedin: ["", "", ""] }
  }

  const kitId = randomUUID()
  const isCarousel = layout === "carousel-3" || layout === "carousel-5"
  const slideCount = layout === "recap-weekly"
    ? resolved[0].source.slideCount
    : resolved.length

  // If AI imagery was requested, generate one square image per slot up front
  // and reuse it across every size (it's a full-bleed background). Generation
  // is best-effort per slot: a failed slot falls back to its templated card
  // rather than failing the whole kit.
  const aiImageBySlot: Record<number, string> = {}
  const aiImageErrors: Array<{ slotIndex: number; error: string }> = []
  if (wantAiImage && layout !== "recap-weekly") {
    for (let slotIndex = 0; slotIndex < resolved.length; slotIndex++) {
      try {
        const img = await generateAtomImageToStorage(resolved[slotIndex].source.caption, kitId, slotIndex)
        aiImageBySlot[slotIndex] = img.url
      } catch (err) {
        aiImageErrors.push({ slotIndex, error: err instanceof Error ? err.message : "ai_image_failed" })
      }
    }
  }

  const tokens = await getBrandTokens()

  // One render job per (size × slot). Each slot atom yields exactly one slide
  // element; recap-weekly yields its own multi-element set.
  const renderJobs: Array<{
    size: SizeKey
    slideIndex: number
    // satori element — matches the legacy generate path's `any` typing
    element: any
    slot: ResolvedSlot
  }> = []
  for (const size of requestedSizes) {
    if (layout === "recap-weekly") {
      const els = await resolved[0].source.buildElements(style, size)
      els.forEach((element, slideIndex) => {
        renderJobs.push({ size, slideIndex, element, slot: resolved[0] })
      })
    } else {
      for (let slotIndex = 0; slotIndex < resolved.length; slotIndex++) {
        const slot = resolved[slotIndex]
        const aiUrl = aiImageBySlot[slotIndex]
        const element = aiUrl
          ? aiBackgroundCard(aiCardFromCaption(slot.source.caption, aiUrl), tokens, size)
          : (await slot.source.buildElements(style, size))[0]
        renderJobs.push({ size, slideIndex: isCarousel ? slotIndex : 0, element, slot })
      }
    }
  }

  const results = await Promise.allSettled(
    renderJobs.map(async (job) => {
      const buf = await renderToPng(job.element, job.size)
      const upload = await uploadAsset(
        buf,
        job.slot.source.storedContentType,
        job.slot.source.sourceId,
        `${layout}-${style}`,
        job.size,
        job.slideIndex,
      )
      return { ...job, upload }
    }),
  )

  // First pass: collect render outcomes WITHOUT touching the DB. Persisting a
  // partial kit is the actual user-facing "looks half-baked / SLIDE 1 OF 1"
  // bug — guard against it by deciding all-or-nothing before any insert.
  const failures: Array<{ size: string; slideIndex: number; error: string }> = []
  const successfulJobs: Array<{ job: typeof renderJobs[number]; upload: Awaited<ReturnType<typeof uploadAsset>> }> = []
  for (let i = 0; i < results.length; i++) {
    const job = renderJobs[i]
    const result = results[i]
    if (result.status === "rejected") {
      failures.push({ size: job.size, slideIndex: job.slideIndex, error: String(result.reason ?? "render_failed") })
    } else {
      successfulJobs.push({ job, upload: result.value.upload })
    }
  }

  // If the client gave up while we were rendering (slow compose, proxy/browser
  // timeout), don't persist anything — the socket is gone and any partial
  // commit would leave a kit the user already abandoned.
  if (req.aborted || res.writableEnded) {
    console.warn(`[studio/compose] aborted mid-render; discarding ${successfulJobs.length} successful renders to avoid a partial kit (kit=${kitId})`)
    return
  }

  // All-or-nothing: a single render failure poisons the whole kit. Surfacing
  // a clear error is much better than silently writing a subset (the source
  // of the "carousel shows 1 of 1" symptom).
  if (failures.length > 0) {
    console.error(`[studio/compose] ${failures.length}/${results.length} renders failed — refusing to persist a partial kit:`, failures.slice(0, 3))
    return res.status(500).json({
      error: "compose_partial_failure",
      attempted: results.length,
      succeeded: successfulJobs.length,
      failures: failures.slice(0, 10),
    })
  }

  // Second pass: every render succeeded — persist the complete kit.
  const generated: Array<Record<string, unknown>> = []
  for (const { job, upload } of successfulJobs) {
    const [row] = await db
      .insert(pressKitAssetsTable)
      .values({
        contentType: job.slot.source.storedContentType,
        contentId: job.slot.source.sourceId,
        template: `${layout}-${style}-${job.slot.atomType}`,
        size: job.size,
        slideIndex: job.slideIndex,
        slideCount,
        templateFamily: layout === "recap-weekly" ? "recap" : (isCarousel ? "carousel" : "item"),
        templateStyle: style,
        layout,
        kitId,
        useAiImage: wantAiImage,
        r2Key: upload.r2Key,
        captionX: captionVariants.x[0] ?? null,
        captionIg: captionVariants.ig[0] ?? null,
        captionLi: captionVariants.linkedin[0] ?? null,
        captionVariants,
        toneHint: safeToneHint,
      })
      .onConflictDoUpdate({
        target: [
          pressKitAssetsTable.contentType,
          pressKitAssetsTable.contentId,
          pressKitAssetsTable.template,
          pressKitAssetsTable.size,
          pressKitAssetsTable.slideIndex,
        ],
        set: {
          r2Key: upload.r2Key,
          slideCount,
          layout,
          kitId,
          useAiImage: wantAiImage,
          templateStyle: style,
          captionX: captionVariants.x[0] ?? null,
          captionIg: captionVariants.ig[0] ?? null,
          captionLi: captionVariants.linkedin[0] ?? null,
          captionVariants,
          toneHint: safeToneHint,
          updatedAt: new Date(),
        },
      })
      .returning({ id: pressKitAssetsTable.id })
    generated.push({
      assetId: row?.id,
      atomType: job.slot.atomType,
      size: job.size,
      slideIndex: job.slideIndex,
      slideCount,
      publicUrl: row?.id ? downloadUrlFor(row.id) : upload.publicUrl,
    })
  }

  return res.json({
    kitId,
    layout,
    style,
    useAiImage: wantAiImage,
    slots: resolved.map((r) => ({ atomType: r.atomType, atomId: r.atomId })),
    generated,
    failures,
    aiImageErrors,
    captionVariants,
  })
})

// ── GET /cms/studio/kit?kitId=… ────────────────────────────────────
router.get("/cms/studio/kit", requireCmsAuth, async (req, res) => {
  const kitId = String(req.query.kitId ?? "")
  if (!kitId) return res.status(400).json({ error: "kitId_required" })

  const rows = await db
    .select()
    .from(pressKitAssetsTable)
    .where(eq(pressKitAssetsTable.kitId, kitId))
    .orderBy(pressKitAssetsTable.size, pressKitAssetsTable.slideIndex)

  const assets = rows.map((r) => ({
    id: r.id,
    template: r.template,
    templateFamily: r.templateFamily,
    templateStyle: r.templateStyle,
    layout: r.layout,
    kitId: r.kitId,
    useAiImage: r.useAiImage,
    size: r.size,
    slideIndex: r.slideIndex,
    slideCount: r.slideCount,
    publicUrl: downloadUrlFor(r.id),
    captionVariants: r.captionVariants,
    chosenCaptionX: r.chosenCaptionX,
    chosenCaptionIg: r.chosenCaptionIg,
    chosenCaptionLi: r.chosenCaptionLi,
    toneHint: r.toneHint,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
  return res.json({ kitId, assets })
})

// ── GET /cms/studio/assets ─────────────────────────────────────────
router.get("/cms/studio/assets", requireCmsAuth, async (req, res) => {
  const postType = String(req.query.postType ?? "")
  const sourceId = Number(req.query.sourceId ?? 0)
  const style = String(req.query.style ?? "")

  if (!VALID_POST_TYPES.has(postType)) return res.status(400).json({ error: "invalid_post_type" })

  const family = POST_TYPE_FAMILIES[postType as PostType]
  const filters = [eq(pressKitAssetsTable.templateFamily, family)]
  // For per-item, contentType is the legacy stored type (poll/prediction/voice/pulse).
  // For non-per-item, we stored the postType in contentType.
  if (family === "item") {
    const itemMap: Record<string, string> = {
      "item-poll": "poll",
      "item-prediction": "prediction",
      "item-voice": "voice",
      "item-pulse": "pulse",
    }
    filters.push(eq(pressKitAssetsTable.contentType, itemMap[postType] ?? postType))
  } else {
    filters.push(eq(pressKitAssetsTable.contentType, postType))
  }
  // contentId is whatever was passed (singleton post types default to 0).
  filters.push(eq(pressKitAssetsTable.contentId, sourceId))
  if (isValidStyle(style)) {
    filters.push(eq(pressKitAssetsTable.templateStyle, style))
  }

  const rows = await db
    .select()
    .from(pressKitAssetsTable)
    .where(and(...filters))
    .orderBy(pressKitAssetsTable.size, pressKitAssetsTable.slideIndex)

  const assets = rows.map((r) => ({
    id: r.id,
    template: r.template,
    templateFamily: r.templateFamily,
    templateStyle: r.templateStyle,
    size: r.size,
    slideIndex: r.slideIndex,
    slideCount: r.slideCount,
    r2Key: r.r2Key,
    // Always serve previews through the API so memory-store assets work
    // identically to R2-backed ones; the api download endpoint handles both.
    publicUrl: downloadUrlFor(r.id),
    captionVariants: r.captionVariants,
    chosenCaptionX: r.chosenCaptionX,
    chosenCaptionIg: r.chosenCaptionIg,
    chosenCaptionLi: r.chosenCaptionLi,
    toneHint: r.toneHint,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
  return res.json({ assets })
})

// ── POST /cms/studio/captions (regenerate variants) ───────────────
router.post("/cms/studio/captions", requireCmsAuth, async (req, res) => {
  const { postType, sourceId, platform, toneHint } = req.body ?? {}
  if (!VALID_POST_TYPES.has(postType)) return res.status(400).json({ error: "invalid_post_type" })
  const safeToneHint: ToneHint = ["punchy", "analytical", "warm"].includes(toneHint) ? toneHint : null
  const platforms: Platform[] | undefined =
    platform === "x" || platform === "ig" || platform === "linkedin" ? [platform] : undefined

  let source: SourceData
  try {
    source = await loadSource(postType as PostType, typeof sourceId === "number" ? sourceId : 0)
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : "load_failed" })
  }

  let variants: CaptionVariants
  try {
    variants = await generateCaptionVariants(source.caption, appUrl(), { toneHint: safeToneHint, platforms })
  } catch (err) {
    return res.status(500).json({ error: "generation_failed", detail: String(err) })
  }

  // Merge platform-only updates with existing variants on the rows
  const family = POST_TYPE_FAMILIES[postType as PostType]
  const filters = [
    eq(pressKitAssetsTable.templateFamily, family),
    eq(pressKitAssetsTable.contentType, source.storedContentType),
    eq(pressKitAssetsTable.contentId, source.sourceId),
  ]
  const existing = await db.select().from(pressKitAssetsTable).where(and(...filters))
  for (const row of existing) {
    const merged: CaptionVariants = {
      x: platforms && !platforms.includes("x") ? row.captionVariants?.x ?? ["", "", ""] : variants.x,
      ig: platforms && !platforms.includes("ig") ? row.captionVariants?.ig ?? ["", "", ""] : variants.ig,
      linkedin:
        platforms && !platforms.includes("linkedin")
          ? row.captionVariants?.linkedin ?? ["", "", ""]
          : variants.linkedin,
    }
    await db
      .update(pressKitAssetsTable)
      .set({
        captionVariants: merged,
        captionX: merged.x[0] ?? null,
        captionIg: merged.ig[0] ?? null,
        captionLi: merged.linkedin[0] ?? null,
        toneHint: safeToneHint,
        updatedAt: new Date(),
      })
      .where(eq(pressKitAssetsTable.id, row.id))
  }

  return res.json({ captionVariants: variants })
})

// ── POST /cms/studio/captions/save (chosen caption) ───────────────
router.post("/cms/studio/captions/save", requireCmsAuth, async (req, res) => {
  const { postType, sourceId, platform, text } = req.body ?? {}
  if (!VALID_POST_TYPES.has(postType)) return res.status(400).json({ error: "invalid_post_type" })
  if (!["x", "ig", "linkedin"].includes(platform)) return res.status(400).json({ error: "invalid_platform" })
  if (typeof text !== "string") return res.status(400).json({ error: "invalid_text" })

  // Per-platform max lengths (matches caption sanitizer ranges)
  const maxByPlatform: Record<string, number> = { x: 280, ig: 2200, linkedin: 3000 }
  if (text.length > maxByPlatform[platform]!) {
    return res.status(400).json({ error: "text_too_long", max: maxByPlatform[platform] })
  }

  let source: SourceData
  try {
    source = await loadSource(postType as PostType, typeof sourceId === "number" ? sourceId : 0)
  } catch (err) {
    return res.status(404).json({ error: err instanceof Error ? err.message : "load_failed" })
  }

  const family = POST_TYPE_FAMILIES[postType as PostType]
  const updateField =
    platform === "x" ? "chosenCaptionX" : platform === "ig" ? "chosenCaptionIg" : "chosenCaptionLi"
  await db
    .update(pressKitAssetsTable)
    .set({ [updateField]: text, updatedAt: new Date() })
    .where(
      and(
        eq(pressKitAssetsTable.templateFamily, family),
        eq(pressKitAssetsTable.contentType, source.storedContentType),
        eq(pressKitAssetsTable.contentId, source.sourceId),
      ),
    )
  return res.json({ ok: true })
})

// ── GET /cms/studio/download/:assetId ──────────────────────────────
// Note: not gated by `requireCmsAuth` so the <img> tag in the studio UI can
// load the preview without sending custom headers. Asset ids are sequential
// integers — acceptable since they're behind the CMS subdomain and only
// reveal generated marketing creative. To lock down further, switch to
// signed cookies on the CMS domain.
router.get("/cms/studio/download/:assetId", async (req, res) => {
  const assetId = Number(req.params.assetId)
  if (!Number.isFinite(assetId)) return res.status(400).json({ error: "invalid_id" })

  const [row] = await db.select().from(pressKitAssetsTable).where(eq(pressKitAssetsTable.id, assetId))
  if (!row) return res.status(404).json({ error: "not_found" })

  const filename = `${row.template}-${row.size}${row.slideIndex > 0 ? `-slide-${row.slideIndex}` : ""}.png`
  const asAttachment = req.query.attachment !== "false"
  res.setHeader("Content-Type", "image/png")
  if (asAttachment) {
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  }

  // Memory-store path (R2 not configured — typical local dev)
  if (isMemKey(row.r2Key)) {
    const stored = getAsset(row.r2Key)
    if (!stored) return res.status(410).json({ error: "asset_expired", hint: "regenerate to refresh in-memory cache" })
    return res.end(stored.buffer)
  }

  // R2 path
  if (!r2Client) return res.status(503).json({ error: "r2_unavailable" })
  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: row.r2Key })
    const obj = await r2Client.send(cmd)
    if (obj.Body && typeof (obj.Body as any).pipe === "function") {
      ;(obj.Body as NodeJS.ReadableStream).pipe(res)
      return
    }
    if (obj.Body && typeof (obj.Body as any).transformToByteArray === "function") {
      const bytes = await (obj.Body as any).transformToByteArray()
      return res.end(Buffer.from(bytes))
    }
    return res.status(500).json({ error: "unsupported_body" })
  } catch (err) {
    console.error("[studio] download failed:", err)
    return res.status(500).json({ error: "download_failed" })
  }
})

// ── GET /cms/studio/zip ─────────────────────────────────────────────
router.get("/cms/studio/zip", requireCmsAuth, async (req, res) => {
  const postType = String(req.query.postType ?? "")
  const sourceId = Number(req.query.sourceId ?? 0)
  const style = String(req.query.style ?? "")
  const assetIdsRaw = String(req.query.assetIds ?? "")

  if (!VALID_POST_TYPES.has(postType)) return res.status(400).json({ error: "invalid_post_type" })

  // Either select by assetIds list, or by (postType, sourceId, style)
  let rows
  if (assetIdsRaw) {
    const ids = assetIdsRaw.split(",").map((x) => Number(x)).filter((n) => Number.isFinite(n))
    if (ids.length === 0) return res.status(400).json({ error: "invalid_asset_ids" })
    rows = await db.select().from(pressKitAssetsTable).where(inArray(pressKitAssetsTable.id, ids))
  } else {
    const family = POST_TYPE_FAMILIES[postType as PostType]
    const filters = [eq(pressKitAssetsTable.templateFamily, family)]
    const itemMap: Record<string, string> = {
      "item-poll": "poll",
      "item-prediction": "prediction",
      "item-voice": "voice",
      "item-pulse": "pulse",
    }
    filters.push(
      eq(
        pressKitAssetsTable.contentType,
        family === "item" ? itemMap[postType] ?? postType : postType,
      ),
    )
    filters.push(eq(pressKitAssetsTable.contentId, sourceId))
    if (isValidStyle(style)) filters.push(eq(pressKitAssetsTable.templateStyle, style))
    rows = await db.select().from(pressKitAssetsTable).where(and(...filters))
  }

  if (rows.length === 0) return res.status(404).json({ error: "no_assets" })

  // Fetch each asset (from memory store or R2 depending on r2Key prefix)
  const entries = await Promise.all(
    rows.map(async (row) => {
      const slide = row.slideIndex > 0 ? `-slide-${row.slideIndex}` : ""
      const name = `${row.template}-${row.size}${slide}.png`

      if (isMemKey(row.r2Key)) {
        const stored = getAsset(row.r2Key)
        if (!stored) throw new Error(`asset_expired:${row.id}`)
        return { name, buffer: stored.buffer }
      }
      if (!r2Client) throw new Error("r2_unavailable")
      const obj = await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: row.r2Key }))
      let buf: Buffer
      if (obj.Body && typeof (obj.Body as any).transformToByteArray === "function") {
        const bytes = await (obj.Body as any).transformToByteArray()
        buf = Buffer.from(bytes)
      } else {
        const chunks: Buffer[] = []
        await new Promise<void>((resolve, reject) => {
          ;(obj.Body as NodeJS.ReadableStream).on("data", (c) => chunks.push(Buffer.from(c)))
          ;(obj.Body as NodeJS.ReadableStream).on("end", () => resolve())
          ;(obj.Body as NodeJS.ReadableStream).on("error", reject)
        })
        buf = Buffer.concat(chunks)
      }
      return { name, buffer: buf }
    }),
  )

  const zipBuf = await bundleZip(entries)
  const zipName = `studio-${postType}${sourceId ? `-${sourceId}` : ""}${isValidStyle(style) ? `-${style}` : ""}.zip`
  res.setHeader("Content-Type", "application/zip")
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`)
  return res.end(zipBuf)
})

// ── GET /cms/studio/sources/:postType ──────────────────────────────
router.get("/cms/studio/sources/:postType", requireCmsAuth, async (req, res) => {
  const postType = String(req.params.postType ?? "")
  if (!VALID_POST_TYPES.has(postType)) return res.status(400).json({ error: "invalid_post_type" })

  if (postType === "item-poll" || postType === "carousel-debate") {
    const rows = await db
      .select({ id: pollsTable.id, label: pollsTable.question, category: pollsTable.category, createdAt: pollsTable.createdAt })
      .from(pollsTable)
      .where(eq(pollsTable.editorialStatus, "approved"))
      .orderBy(desc(pollsTable.createdAt))
      .limit(50)
    return res.json({ sources: rows })
  }
  if (postType === "item-prediction") {
    const rows = await db
      .select({ id: predictionsTable.id, label: predictionsTable.question, createdAt: predictionsTable.createdAt })
      .from(predictionsTable)
      .where(eq(predictionsTable.editorialStatus, "approved"))
      .orderBy(desc(predictionsTable.createdAt))
      .limit(50)
    return res.json({ sources: rows })
  }
  if (postType === "item-voice") {
    const rows = await db
      .select({ id: profilesTable.id, label: profilesTable.name, createdAt: profilesTable.createdAt })
      .from(profilesTable)
      .orderBy(desc(profilesTable.createdAt))
      .limit(50)
    return res.json({ sources: rows })
  }
  if (postType === "item-pulse") {
    const rows = await db
      .select({ id: pulseTopicsTable.id, label: pulseTopicsTable.title, createdAt: pulseTopicsTable.createdAt })
      .from(pulseTopicsTable)
      .where(eq(pulseTopicsTable.editorialStatus, "approved"))
      .orderBy(desc(pulseTopicsTable.createdAt))
      .limit(50)
    return res.json({ sources: rows })
  }
  if (postType === "about-pillar") {
    const cfg = await loadAbout()
    const sources = (cfg.pillars ?? []).map((p, i) => ({ id: i, label: `${p.num} · ${p.title}` }))
    return res.json({ sources })
  }
  if (postType === "about-belief") {
    const cfg = await loadAbout()
    const sources = (cfg.beliefs ?? []).map((b, i) => ({ id: i, label: `${b.num} · ${b.title}` }))
    return res.json({ sources })
  }
  // postTypes that have no source picker (singleton sources)
  return res.json({ sources: [] })
})

// ── AI Portrait (Nano Banana) ─────────────────────────────────────
//
// SSE stream that generates N portraits sequentially. Each variant emits
// `variant_done` with its public Supabase URL and the elapsed/ETA timings.
//
// EventSource cannot send custom headers, so we accept the CMS token via
// `?token=` query param. The token is validated against active_sessions
// using the same shape as requireCmsAuth.

const PORTRAIT_VARIANT_COUNT = 3
// Median Nano Banana wall time per portrait (s) — used as the initial ETA
// before any variant completes.
const DEFAULT_VARIANT_SECONDS = 12

async function authenticateCmsByQueryToken(token: string): Promise<boolean> {
  if (!token) return false
  const [session] = await db
    .select()
    .from(cmsSessionsTable)
    .where(eq(cmsSessionsTable.token, token))
  if (!session) return false
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) return false
  return true
}

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

router.get("/cms/studio/portrait/stream", async (req: Request, res: Response) => {
  const token = String(req.query.token ?? "")
  const sourceId = Number(req.query.sourceId ?? 0)
  const postType = String(req.query.postType ?? "")
  if (postType !== "item-voice") {
    return res.status(400).json({ error: "AI portraits are only supported for item-voice." })
  }
  if (!(await authenticateCmsByQueryToken(token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // SSE handshake — open the stream *before* checking config so the browser
  // receives a typed `error` event (with a message it can render) rather than
  // a plain HTTP 5xx, which EventSource surfaces as a generic onerror.
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  if (!isNanoBananaAvailable) {
    sseWrite(res, "error", { message: "GEMINI_API_KEY is not set on the api-server. Add it to artifacts/api-server/.env and restart." })
    res.end()
    return
  }
  if (!isSupabaseStorageAvailable) {
    sseWrite(res, "error", { message: "Supabase storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing)." })
    res.end()
    return
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, sourceId))
  if (!profile) {
    sseWrite(res, "error", { message: "Voice not found." })
    res.end()
    return
  }

  const voice: VoiceSubject = {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    company: profile.company,
    blurb: profile.headline ?? profile.summary,
    quote: profile.quote,
  }
  const sessionId = randomUUID().slice(0, 8)
  const totalCount = PORTRAIT_VARIANT_COUNT
  const startedAt = Date.now()
  const completedDurationsMs: number[] = []
  const generatedPaths: string[] = []
  const generatedUrls: string[] = []

  sseWrite(res, "start", { sessionId, totalCount, estimatedTotalMs: totalCount * DEFAULT_VARIANT_SECONDS * 1000 })

  try {
    for (let i = 0; i < totalCount; i++) {
      const avgMs = completedDurationsMs.length === 0
        ? DEFAULT_VARIANT_SECONDS * 1000
        : completedDurationsMs.reduce((a, b) => a + b, 0) / completedDurationsMs.length
      const remaining = totalCount - i
      const etaMs = Math.round(avgMs * remaining)

      sseWrite(res, "variant_started", { index: i, etaMs })

      const variant = await generatePortraitVariant(voice, sessionId, i)
      completedDurationsMs.push(variant.elapsedMs)
      generatedPaths.push(variant.storagePath)
      generatedUrls.push(variant.url)

      sseWrite(res, "variant_done", {
        index: i,
        url: variant.url,
        storagePath: variant.storagePath,
        elapsedMs: variant.elapsedMs,
        completedCount: i + 1,
        totalCount,
      })
    }

    sseWrite(res, "complete", {
      urls: generatedUrls,
      storagePaths: generatedPaths,
      totalElapsedMs: Date.now() - startedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    sseWrite(res, "error", { message })
    // Clean up anything we managed to generate before the failure so we don't
    // leak orphaned files in Supabase storage.
    if (generatedPaths.length > 0) {
      void deleteUnchosenPortraits(generatedPaths)
    }
  } finally {
    res.end()
  }
  return
})

router.post("/cms/studio/portrait/select", requireCmsAuth, async (req: Request, res: Response) => {
  const { sourceId, chosenIndex, storagePaths, urls } = req.body ?? {}
  if (typeof sourceId !== "number" || typeof chosenIndex !== "number") {
    return res.status(400).json({ error: "sourceId and chosenIndex are required" })
  }
  if (!Array.isArray(storagePaths) || !Array.isArray(urls)) {
    return res.status(400).json({ error: "storagePaths and urls arrays are required" })
  }
  if (chosenIndex < 0 || chosenIndex >= storagePaths.length) {
    return res.status(400).json({ error: "chosenIndex out of range" })
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, sourceId))
  if (!profile) return res.status(404).json({ error: "Voice not found." })

  const chosenUrl = String(urls[chosenIndex])
  const chosenPath = String(storagePaths[chosenIndex])
  const unchosenPaths = storagePaths
    .filter((_, i) => i !== chosenIndex)
    .map(String)
    .filter(Boolean)

  await db
    .update(profilesTable)
    .set({ imageUrl: chosenUrl })
    .where(eq(profilesTable.id, sourceId))

  await deleteUnchosenPortraits(unchosenPaths)

  // Invalidate any existing item-voice press-kit assets for this voice so the
  // next Generate kit produces a fresh render with the new portrait.
  await db
    .delete(pressKitAssetsTable)
    .where(
      and(
        eq(pressKitAssetsTable.contentType, "voice"),
        eq(pressKitAssetsTable.contentId, sourceId),
      ),
    )

  return res.json({ imageUrl: chosenUrl, storagePath: chosenPath, deletedCount: unchosenPaths.length })
})

export default router
