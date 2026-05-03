// ──────────────────────────────────────────────────────────────
//  Debate card renderer — OG (1200×630) & Story (1080×1920)
//
//  These produce pixel-identical output to the original
//  generateShareCard / generateStoryCard in shareCard.ts.
// ──────────────────────────────────────────────────────────────

import type { DebateShareContext } from "../types"
import {
  WHITE,
  RED,
  MUTED,
  BORDER,
  BARLOW,
  DM_SANS,
  wrapText,
  drawBrandHeader,
  drawResultsBars,
} from "./shared"

// ── OG card content (1200×630) ──────────────────────────────

export function drawDebateOG(
  ctx: CanvasRenderingContext2D,
  context: DebateShareContext,
  W: number,
  _H: number,
  PAD: number,
): void {
  // Brand header
  drawBrandHeader(ctx, PAD, PAD, 1)

  // Category badge (top-right)
  if (context.category) {
    const catText = context.category.toUpperCase()
    ctx.font = `800 12px ${DM_SANS}`
    const catWidth = ctx.measureText(catText).width + 24
    ctx.fillStyle = RED
    ctx.fillRect(W - PAD - catWidth, PAD, catWidth, 28)
    ctx.fillStyle = WHITE
    ctx.textAlign = "center"
    ctx.fillText(catText, W - PAD - catWidth / 2, PAD + 19)
    ctx.textAlign = "left"
  }

  // Question (main headline)
  ctx.fillStyle = WHITE
  ctx.font = `900 48px ${BARLOW}`
  wrapText(ctx, context.title.toUpperCase(), PAD, PAD + 150, W - PAD * 2, 56, 3)

  // Results section
  if (context.options && context.options.length >= 2) {
    drawResultsBars(ctx, context.options, PAD, PAD + 340, W - PAD * 2, context.votedOptionText)
  } else if (context.votedOptionText && context.votedPct !== undefined) {
    // Simple voted option display
    ctx.font = `700 13px ${DM_SANS}`
    ctx.fillStyle = MUTED
    ctx.fillText("YOU VOTED", PAD, PAD + 360)

    ctx.fillStyle = RED
    ctx.font = `900 32px ${BARLOW}`
    ctx.fillText(context.votedOptionText.toUpperCase(), PAD, PAD + 400)

    // Progress bar
    const barY = PAD + 425
    ctx.fillStyle = BORDER
    ctx.fillRect(PAD, barY, W - PAD * 2, 12)
    ctx.fillStyle = RED
    ctx.fillRect(PAD, barY, Math.round((W - PAD * 2) * (context.votedPct / 100)), 12)

    ctx.font = `800 14px ${DM_SANS}`
    ctx.fillStyle = WHITE
    ctx.fillText(`${Math.round(context.votedPct)}% of voters agree`, PAD, barY + 36)
  }
}

// ── Story card content (1080×1920) ──────────────────────────

export function drawDebateStory(
  ctx: CanvasRenderingContext2D,
  context: DebateShareContext,
  W: number,
  _H: number,
  PAD: number,
): void {
  // Brand header (larger — scale=2)
  drawBrandHeader(ctx, PAD, 210, 2)

  // Divider
  ctx.fillStyle = BORDER
  ctx.fillRect(PAD, 340, W - PAD * 2, 1)

  // Category badge
  if (context.category) {
    ctx.font = `900 20px ${DM_SANS}`
    const catText = context.category.toUpperCase()
    const catWidth = ctx.measureText(catText).width + 40
    ctx.fillStyle = RED
    ctx.fillRect(PAD, 380, catWidth, 44)
    ctx.fillStyle = WHITE
    ctx.textAlign = "center"
    ctx.fillText(catText, PAD + catWidth / 2, 410)
    ctx.textAlign = "left"
  }

  // Question
  ctx.fillStyle = WHITE
  ctx.font = `900 76px ${BARLOW}`
  wrapText(ctx, context.title.toUpperCase(), PAD, 520, W - PAD * 2, 88, 4)

  // "YOU VOTED" section
  const voteY = 1080
  ctx.font = `800 22px ${DM_SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText("YOU VOTED", PAD, voteY)

  if (context.votedOptionText) {
    ctx.fillStyle = RED
    ctx.font = `900 58px ${BARLOW}`
    ctx.fillText(context.votedOptionText.toUpperCase(), PAD, voteY + 68)
  }

  // Compact results bars (top 3)
  if (context.options && context.options.length >= 2) {
    const barsY = voteY + 140
    context.options.slice(0, 3).forEach((opt, i) => {
      const rowY = barsY + i * 80
      const isVoted = opt.text === context.votedOptionText
      const color = isVoted ? RED : WHITE

      ctx.font = `700 26px ${DM_SANS}`
      ctx.fillStyle = isVoted ? RED : WHITE
      const label = opt.text.length > 30 ? opt.text.slice(0, 27) + "…" : opt.text
      ctx.fillText(label, PAD, rowY)

      ctx.font = `900 32px "Barlow Condensed", Arial, sans-serif`
      ctx.textAlign = "right"
      ctx.fillStyle = color
      ctx.fillText(`${Math.round(opt.percentage)}%`, W - PAD, rowY)
      ctx.textAlign = "left"

      ctx.fillStyle = BORDER
      ctx.fillRect(PAD, rowY + 14, W - PAD * 2, 14)
      ctx.fillStyle = color
      ctx.fillRect(
        PAD,
        rowY + 14,
        Math.round((W - PAD * 2) * (Math.max(opt.percentage, 0) / 100)),
        14,
      )
    })
  } else if (context.votedPct !== undefined) {
    const barY = voteY + 170
    const barW = W - PAD * 2
    ctx.fillStyle = BORDER
    ctx.fillRect(PAD, barY, barW, 16)
    ctx.fillStyle = RED
    ctx.fillRect(PAD, barY, Math.round(barW * (context.votedPct / 100)), 16)

    ctx.font = `800 24px ${DM_SANS}`
    ctx.fillStyle = WHITE
    ctx.fillText(`${Math.round(context.votedPct)}% OF THE REGION AGREES`, PAD, barY + 52)
  }

  // Stats strip
  ctx.fillStyle = MUTED
  ctx.font = `700 22px ${DM_SANS}`
  ctx.fillText(`${context.totalVotes.toLocaleString()} VOTES · LIVE NOW`, PAD, 1620)
}
