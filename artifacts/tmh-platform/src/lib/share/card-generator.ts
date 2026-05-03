// ──────────────────────────────────────────────────────────────
//  Card generator — compositor that creates the canvas, calls
//  the correct content renderer, and returns a shareable Blob.
// ──────────────────────────────────────────────────────────────

import type { ShareContext, CardFormat } from "./types"
import { waitForFonts, drawBackground, drawFooter } from "./card-renderers/shared"
import { drawDebateOG, drawDebateStory } from "./card-renderers/debate"
import { drawPredictionOG, drawPredictionStory } from "./card-renderers/prediction"
import { drawPulseOG, drawPulseStory } from "./card-renderers/pulse"

// ── Canvas dimensions ───────────────────────────────────────

const DIMS = {
  og: { w: 1200, h: 630 },
  story: { w: 1080, h: 1920 },
} as const

// ── Public API ──────────────────────────────────────────────

/**
 * Generate a shareable card image for any content type.
 *
 * @param ctx - Discriminated share context (debate | prediction | pulse)
 * @param format - "og" for social cards (1200×630), "story" for IG stories (1080×1920)
 * @returns PNG blob, or null if canvas creation fails
 */
export async function generateCard(
  ctx: ShareContext,
  format: CardFormat,
): Promise<Blob | null> {
  const { w: W, h: H } = DIMS[format]
  const PAD = format === "og" ? 70 : 90

  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext("2d")
  if (!c) return null

  try {
    await waitForFonts()

    // Shared background (gradient + accent stripe + top border)
    drawBackground(c, W, H, format)

    // Content-specific drawing
    if (format === "og") {
      switch (ctx.contentType) {
        case "debate":
          drawDebateOG(c, ctx, W, H, PAD)
          break
        case "prediction":
          drawPredictionOG(c, ctx, W, H, PAD)
          break
        case "pulse":
          drawPulseOG(c, ctx, W, H, PAD)
          break
      }
    } else {
      switch (ctx.contentType) {
        case "debate":
          drawDebateStory(c, ctx, W, H, PAD)
          break
        case "prediction":
          drawPredictionStory(c, ctx, W, H, PAD)
          break
        case "pulse":
          drawPulseStory(c, ctx, W, H, PAD)
          break
      }
    }

    // Footer (OG: divider + stats + domain  |  Story: red CTA block)
    const footerText = getFooterText(ctx)
    const ctaText = ctx.cta ?? getDefaultCta(ctx)
    drawFooter(c, footerText, ctaText, W, H, PAD, format)

    return new Promise<Blob | null>(resolve =>
      canvas.toBlob(b => resolve(b), "image/png", 0.95),
    )
  } catch {
    return null
  }
}

// ── Share-with-image helper ─────────────────────────────────

/**
 * Share or download a generated card image.
 *
 * Uses the Web Share API with file support on mobile;
 * falls back to a direct download on desktop browsers.
 */
export async function shareWithImage(opts: {
  blob: Blob
  title: string
  text: string
  url: string
  fileName?: string
}): Promise<"shared" | "downloaded" | "failed"> {
  const file = new File(
    [opts.blob],
    opts.fileName ?? "tribunal-share.png",
    { type: "image/png" },
  )

  // Mobile: Web Share API with file
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        files: [file],
      })
      return "shared"
    } catch (err: any) {
      if (err?.name === "AbortError") return "failed"
      // Fall through to download
    }
  }

  // Desktop fallback: download the image
  try {
    const url = URL.createObjectURL(opts.blob)
    const a = document.createElement("a")
    a.href = url
    a.download = opts.fileName ?? "tribunal-share.png"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return "downloaded"
  } catch {
    return "failed"
  }
}

// ── Internal helpers ────────────────────────────────────────

function getFooterText(ctx: ShareContext): string {
  if (ctx.contentType === "pulse") {
    return "REAL-TIME DATA · THE TRIBUNAL PULSE"
  }
  return `${ctx.totalVotes.toLocaleString()} ${
    ctx.contentType === "debate" ? "VOTES · JOIN THE DEBATE" : "PREDICTIONS · LIVE NOW"
  }`
}

function getDefaultCta(ctx: ShareContext): string {
  switch (ctx.contentType) {
    case "debate":
      return "CAST YOUR VOTE"
    case "prediction":
      return "LOCK IN YOUR PREDICTION"
    case "pulse":
      return "TRACK THE PULSE"
  }
}
