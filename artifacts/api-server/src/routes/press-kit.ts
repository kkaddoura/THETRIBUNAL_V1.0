/**
 * CMS-protected press-kit routes. Generates branded social-media assets +
 * AI captions for any platform content (poll, prediction, voice, pulse).
 *
 * - POST /api/cms/press-kit/generate
 *     body: { contentType, contentId, templates[]?, sizes[]? }
 *     Renders the requested combinations, stores press_kit_assets rows.
 *
 * - GET /api/cms/press-kit/:contentType/:contentId
 *     Returns existing assets for a content item.
 *
 * - POST /api/cms/press-kit/:assetId/regenerate-caption
 *     Re-runs the caption AI for a single asset row.
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
} from "@workspace/db"
import { and, eq, gt } from "drizzle-orm"
import {
  ALL_SIZE_KEYS,
  isValidSize,
  TEMPLATES,
  renderToPng,
  uploadAsset,
  generateCaptions,
  pollResultSplit,
  voiceQuote,
  predictionMomentum,
  pulseStat,
  type SizeKey,
} from "../lib/press-kit/index.js"

const router = Router()

// CMS auth — same pattern as cms.ts
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
    console.error("[press-kit] auth check failed:", err)
    res.status(500).json({ error: "Auth check failed" })
  }
}

function appUrl(): string {
  const url = process.env.APP_URL
  if (!url) {
    throw new Error("APP_URL env var is required for press-kit routes (used in caption links)")
  }
  return url
}

const VALID_CONTENT_TYPES = new Set(["poll", "prediction", "voice", "pulse"])

router.post("/cms/press-kit/generate", requireCmsAuth, async (req, res) => {
  const { contentType, contentId, templates, sizes } = req.body ?? {}

  if (!VALID_CONTENT_TYPES.has(contentType)) {
    return res.status(400).json({ error: "invalid_content_type" })
  }
  if (typeof contentId !== "number" || contentId <= 0) {
    return res.status(400).json({ error: "invalid_content_id" })
  }

  const requestedSizes: SizeKey[] = Array.isArray(sizes) && sizes.length
    ? (sizes as string[]).filter(isValidSize)
    : ALL_SIZE_KEYS

  const requestedTemplates: string[] = Array.isArray(templates) && templates.length
    ? (templates as string[]).filter((t) => t in TEMPLATES)
    : Object.keys(TEMPLATES).filter((t) => TEMPLATES[t as keyof typeof TEMPLATES] === contentType)

  if (requestedTemplates.length === 0) {
    return res.status(400).json({ error: "no_template_for_content_type" })
  }

  // Load source data
  const tokens = await loadBrandTokens()
  let sourceData: SourceData
  try {
    sourceData = await loadContent(contentType, contentId)
  } catch (err) {
    return res.status(404).json({ error: "content_not_found" })
  }

  // Generate captions once for the content (reused across all sizes/templates)
  const captionInput = buildCaptionInput(contentType, contentId, sourceData)
  const captions = await generateCaptions(captionInput, appUrl())

  const results: { template: string; size: string; r2Key: string; publicUrl: string }[] = []

  for (const template of requestedTemplates) {
    for (const size of requestedSizes) {
      try {
        const element = buildElement(template, sourceData, tokens, size)
        const png = await renderToPng(element, size)
        const upload = await uploadAsset(png, contentType, contentId, template, size)

        await db
          .insert(pressKitAssetsTable)
          .values({
            contentType,
            contentId,
            template,
            size,
            r2Key: upload.r2Key,
            captionX: captions.x,
            captionIg: captions.ig,
            captionLi: captions.linkedin,
          })
          .onConflictDoUpdate({
            target: [
              pressKitAssetsTable.contentType,
              pressKitAssetsTable.contentId,
              pressKitAssetsTable.template,
              pressKitAssetsTable.size,
            ],
            set: {
              r2Key: upload.r2Key,
              captionX: captions.x,
              captionIg: captions.ig,
              captionLi: captions.linkedin,
              updatedAt: new Date(),
            },
          })

        results.push({ template, size, r2Key: upload.r2Key, publicUrl: upload.publicUrl })
      } catch (err) {
        console.error(`[press-kit] failed ${template}/${size}:`, err)
      }
    }
  }

  return res.json({ generated: results, captions })
})

router.get("/cms/press-kit/:contentType/:contentId", requireCmsAuth, async (req, res) => {
  const contentType = String(req.params.contentType ?? "")
  const contentId = Number(req.params.contentId)
  if (!VALID_CONTENT_TYPES.has(contentType) || !Number.isFinite(contentId)) {
    return res.status(400).json({ error: "invalid_params" })
  }
  const rows = await db
    .select()
    .from(pressKitAssetsTable)
    .where(
      and(
        eq(pressKitAssetsTable.contentType, contentType),
        eq(pressKitAssetsTable.contentId, contentId),
      ),
    )

  const publicBase = process.env.R2_PUBLIC_URL ?? ""
  const assets = rows.map((r: typeof pressKitAssetsTable.$inferSelect) => ({
    id: r.id,
    template: r.template,
    size: r.size,
    r2Key: r.r2Key,
    publicUrl: publicBase ? `${publicBase.replace(/\/$/, "")}/${r.r2Key}` : r.r2Key,
    captionX: r.captionX,
    captionIg: r.captionIg,
    captionLi: r.captionLi,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
  return res.json({ assets })
})

router.post("/cms/press-kit/:assetId/regenerate-caption", requireCmsAuth, async (req, res) => {
  const assetId = Number(req.params.assetId)
  if (!Number.isFinite(assetId)) return res.status(400).json({ error: "invalid_id" })

  const [row] = await db.select().from(pressKitAssetsTable).where(eq(pressKitAssetsTable.id, assetId))
  if (!row) return res.status(404).json({ error: "not_found" })

  let sourceData: SourceData
  try {
    sourceData = await loadContent(row.contentType, row.contentId)
  } catch {
    return res.status(404).json({ error: "content_not_found" })
  }

  const captions = await generateCaptions(
    buildCaptionInput(row.contentType, row.contentId, sourceData),
    appUrl(),
  )

  // Re-apply captions to all assets for this content (one caption set per content).
  await db
    .update(pressKitAssetsTable)
    .set({
      captionX: captions.x,
      captionIg: captions.ig,
      captionLi: captions.linkedin,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(pressKitAssetsTable.contentType, row.contentType),
        eq(pressKitAssetsTable.contentId, row.contentId),
      ),
    )

  return res.json({ captions })
})

// ── helpers ────────────────────────────────────────────────────

interface SourceData {
  pollQuestion?: string
  pollCategory?: string
  pollTotalVotes?: number
  pollOptions?: { text: string; percentage: number }[]
  predictionQuestion?: string
  predictionYesPercentage?: number
  predictionTotalVotes?: number
  predictionDaysToResolve?: number | null
  voiceName?: string
  voiceRole?: string
  voiceCompany?: string
  voiceQuote?: string
  voiceImageUrl?: string
  pulseTitle?: string
  pulseStat?: string
  pulseDelta?: string
  pulseDeltaUp?: boolean
  pulseSource?: string
}

async function loadBrandTokens() {
  const { getBrandTokens } = await import("../lib/design-tokens-cache.js")
  return getBrandTokens()
}

async function loadContent(contentType: string, contentId: number): Promise<SourceData> {
  if (contentType === "poll") {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, contentId))
    if (!poll) throw new Error("not_found")
    const options = await db
      .select()
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, contentId))
    const total = options.reduce(
      (sum: number, o: typeof pollOptionsTable.$inferSelect) =>
        sum + (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0),
      0,
    )
    return {
      pollQuestion: poll.question,
      pollCategory: poll.category,
      pollTotalVotes: total,
      pollOptions: options.map((o: typeof pollOptionsTable.$inferSelect) => {
        const count = (o.voteCount ?? 0) + (o.dummyVoteCount ?? 0)
        return {
          text: o.text,
          percentage: total > 0 ? (count / total) * 100 : 0,
        }
      }),
    }
  }
  if (contentType === "prediction") {
    const [pred] = await db.select().from(predictionsTable).where(eq(predictionsTable.id, contentId))
    if (!pred) throw new Error("not_found")
    const days = pred.resolvesAt
      ? Math.max(0, Math.round((new Date(pred.resolvesAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null
    return {
      predictionQuestion: pred.question,
      predictionYesPercentage: pred.yesPercentage,
      predictionTotalVotes: pred.totalCount + (pred.dummyTotalCount ?? 0),
      predictionDaysToResolve: days,
    }
  }
  if (contentType === "voice") {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, contentId))
    if (!profile) throw new Error("not_found")
    return {
      voiceName: profile.name,
      voiceRole: profile.role ?? "",
      voiceCompany: profile.company ?? undefined,
      voiceQuote: profile.quote ?? profile.headline ?? "",
      voiceImageUrl: profile.imageUrl ?? undefined,
    }
  }
  if (contentType === "pulse") {
    const [topic] = await db.select().from(pulseTopicsTable).where(eq(pulseTopicsTable.id, contentId))
    if (!topic) throw new Error("not_found")
    return {
      pulseTitle: topic.title,
      pulseStat: topic.stat,
      pulseDelta: topic.delta ?? undefined,
      pulseDeltaUp: topic.deltaUp,
      pulseSource: topic.source ?? undefined,
    }
  }
  throw new Error("unknown_content_type")
}

function buildElement(template: string, data: SourceData, tokens: Awaited<ReturnType<typeof loadBrandTokens>>, size: SizeKey) {
  switch (template) {
    case "poll-result-split":
      return pollResultSplit(
        {
          question: data.pollQuestion ?? "",
          category: data.pollCategory,
          totalVotes: data.pollTotalVotes ?? 0,
          options: data.pollOptions ?? [],
        },
        tokens,
        size,
      )
    case "prediction-momentum":
      return predictionMomentum(
        {
          question: data.predictionQuestion ?? "",
          yesPercentage: data.predictionYesPercentage ?? 50,
          totalVotes: data.predictionTotalVotes ?? 0,
          daysToResolve: data.predictionDaysToResolve ?? null,
        },
        tokens,
        size,
      )
    case "voice-quote":
      return voiceQuote(
        {
          name: data.voiceName ?? "",
          role: data.voiceRole ?? "",
          company: data.voiceCompany,
          quote: data.voiceQuote ?? "",
          imageUrl: data.voiceImageUrl,
        },
        tokens,
        size,
      )
    case "pulse-stat":
      return pulseStat(
        {
          title: data.pulseTitle ?? "",
          stat: data.pulseStat ?? "",
          delta: data.pulseDelta,
          deltaUp: data.pulseDeltaUp,
          source: data.pulseSource,
        },
        tokens,
        size,
      )
    default:
      throw new Error(`unknown template: ${template}`)
  }
}

function buildCaptionInput(contentType: string, contentId: number, data: SourceData) {
  if (contentType === "poll") {
    const winner = (data.pollOptions ?? []).reduce(
      (best, o) => (o.percentage > (best?.percentage ?? 0) ? o : best),
      undefined as { text: string; percentage: number } | undefined,
    )
    return {
      contentType: "poll" as const,
      contentId,
      question: data.pollQuestion,
      category: data.pollCategory,
      winningOption: winner?.text,
      winningPercentage: winner?.percentage,
    }
  }
  if (contentType === "prediction") {
    return {
      contentType: "prediction" as const,
      contentId,
      question: data.predictionQuestion,
    }
  }
  if (contentType === "voice") {
    return {
      contentType: "voice" as const,
      contentId,
      voicesName: data.voiceName,
      quote: data.voiceQuote,
    }
  }
  return {
    contentType: "pulse" as const,
    contentId,
    stat: data.pulseStat,
  }
}

export default router
