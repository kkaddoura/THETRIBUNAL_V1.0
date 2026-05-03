// ──────────────────────────────────────────────────────────────
//  Prediction card renderer — OG (1200×630) & Story (1080×1920)
// ──────────────────────────────────────────────────────────────

import type { PredictionShareContext } from "../types"
import {
  WHITE,
  RED,
  GREEN,
  MUTED,
  BORDER,
  BARLOW,
  DM_SANS,
  wrapText,
  drawBrandHeader,
  drawResultsBars,
} from "./shared"

// ── Helpers ─────────────────────────────────────────────────

function drawConfidenceBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  yesPercentage: number,
  noPercentage: number,
): void {
  const yesW = Math.round(width * (Math.max(yesPercentage, 0) / 100))
  const noW = width - yesW

  // Yes (green) portion
  ctx.fillStyle = GREEN
  ctx.fillRect(x, y, yesW, height)

  // No (red) portion
  ctx.fillStyle = RED
  ctx.fillRect(x + yesW, y, noW, height)

  // Labels
  ctx.font = `900 16px ${BARLOW}`
  ctx.textAlign = "left"
  ctx.fillStyle = WHITE
  if (yesW > 80) {
    ctx.fillText(`YES ${Math.round(yesPercentage)}%`, x + 10, y + height / 2 + 6)
  }
  ctx.textAlign = "right"
  if (noW > 80) {
    ctx.fillText(`NO ${Math.round(noPercentage)}%`, x + width - 10, y + height / 2 + 6)
  }
  ctx.textAlign = "left"
}

function drawMomentumIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  momentum: number,
  direction: "up" | "down",
  fontSize: number,
): void {
  const arrow = direction === "up" ? "↑" : "↓"
  const color = direction === "up" ? GREEN : RED

  ctx.fillStyle = color
  ctx.font = `800 ${fontSize}px ${DM_SANS}`
  ctx.textAlign = "left"
  ctx.fillText(`${arrow} ${Math.abs(momentum)}pts`, x, y)
}

// ── OG card content (1200×630) ──────────────────────────────

export function drawPredictionOG(
  ctx: CanvasRenderingContext2D,
  context: PredictionShareContext,
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
  const barAreaY = PAD + 340
  const barAreaW = W - PAD * 2

  if (context.options && context.options.length >= 2) {
    // Multi-option: draw results bars like debate
    drawResultsBars(ctx, context.options, PAD, barAreaY, barAreaW, context.votedChoice)
  } else if (
    context.yesPercentage !== undefined &&
    context.noPercentage !== undefined
  ) {
    // Yes/No: horizontal confidence bar
    drawConfidenceBar(ctx, PAD, barAreaY, barAreaW, 32, context.yesPercentage, context.noPercentage)
  }

  // Momentum indicator
  if (context.momentum !== undefined && context.momentumDirection) {
    const momentumY =
      context.options && context.options.length >= 2
        ? barAreaY + Math.min(context.options.length, 4) * 52 + 20
        : barAreaY + 60
    drawMomentumIndicator(ctx, PAD, momentumY, context.momentum, context.momentumDirection, 16)
  }

  // Resolves-at tag
  if (context.resolvesAt) {
    const date = new Date(context.resolvesAt)
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    ctx.fillStyle = MUTED
    ctx.font = `700 13px ${DM_SANS}`
    ctx.textAlign = "left"
    ctx.fillText(`RESOLVES: ${formatted.toUpperCase()}`, PAD, _H - PAD - 50)
  }
}

// ── Story card content (1080×1920) ──────────────────────────

export function drawPredictionStory(
  ctx: CanvasRenderingContext2D,
  context: PredictionShareContext,
  W: number,
  _H: number,
  PAD: number,
): void {
  // Brand header (scale=2)
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

  // "YOUR PREDICTION" section
  const voteY = 1080
  ctx.font = `800 22px ${DM_SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText("YOUR PREDICTION", PAD, voteY)

  if (context.votedChoice) {
    ctx.fillStyle = RED
    ctx.font = `900 58px ${BARLOW}`
    ctx.fillText(context.votedChoice.toUpperCase(), PAD, voteY + 68)
  }

  // Results bars or confidence bar
  const barsY = voteY + 140

  if (context.options && context.options.length >= 2) {
    context.options.slice(0, 3).forEach((opt, i) => {
      const rowY = barsY + i * 80
      const isVoted = opt.text === context.votedChoice
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
  } else if (
    context.yesPercentage !== undefined &&
    context.noPercentage !== undefined
  ) {
    drawConfidenceBar(
      ctx,
      PAD,
      barsY,
      W - PAD * 2,
      48,
      context.yesPercentage,
      context.noPercentage,
    )
  }

  // Momentum indicator
  if (context.momentum !== undefined && context.momentumDirection) {
    const momentumY =
      context.options && context.options.length >= 2
        ? barsY + Math.min(context.options.length, 3) * 80 + 20
        : barsY + 80
    drawMomentumIndicator(ctx, PAD, momentumY, context.momentum, context.momentumDirection, 24)
  }

  // Resolves-at tag
  if (context.resolvesAt) {
    const date = new Date(context.resolvesAt)
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    ctx.fillStyle = MUTED
    ctx.font = `700 20px ${DM_SANS}`
    ctx.textAlign = "left"
    ctx.fillText(`RESOLVES: ${formatted.toUpperCase()}`, PAD, 1560)
  }

  // Stats strip
  ctx.fillStyle = MUTED
  ctx.font = `700 22px ${DM_SANS}`
  ctx.fillText(`${context.totalVotes.toLocaleString()} PREDICTIONS · LIVE NOW`, PAD, 1620)
}
